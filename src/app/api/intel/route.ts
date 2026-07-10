import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groq } from "@/lib/groq";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch latest CVEs from NVD
    const res = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=50&startIndex=0&cvssV3Severity=HIGH",
      {
        headers: { "User-Agent": "VulnScope/1.0" },
        next: { revalidate: 3600 },
      },
    );

    const data = await res.json();
    const cves = data.vulnerabilities ?? [];

    // Get user's scanned targets and their vulnerabilities
    const userScans = await prisma.scan.findMany({
      where: { userId: session.user.id, status: "COMPLETED" },
      include: { vulnerabilities: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Extract categories found across all scans
    const foundCategories = new Set(
      userScans.flatMap((s) =>
        s.vulnerabilities.map((v) => v.category.toLowerCase()),
      ),
    );

    const scannedTargets = userScans.map((s) => s.targetUrl);
    console.log("Found categories:", Array.from(foundCategories));
    console.log("User scans count:", userScans.length);

    // Transform CVEs
    const feed = cves.map((item: any) => {
      const cve = item.cve;
      const metrics =
        cve.metrics?.cvssMetricV31?.[0] ?? cve.metrics?.cvssMetricV2?.[0];
      const score = metrics?.cvssData?.baseScore ?? 0;
      const severity =
        metrics?.cvssData?.baseSeverity ??
        (score >= 9
          ? "CRITICAL"
          : score >= 7
            ? "HIGH"
            : score >= 4
              ? "MEDIUM"
              : "LOW");

      const description =
        cve.descriptions?.find((d: any) => d.lang === "en")?.value ?? "";

      const weaknesses =
        cve.weaknesses?.flatMap((w: any) =>
          w.description.map((d: any) => d.value),
        ) ?? [];

      const affectedProducts =
        cve.configurations
          ?.flatMap(
            (c: any) =>
              c.nodes?.flatMap(
                (n: any) =>
                  n.cpeMatch?.map(
                    (m: any) => m.criteria?.split(":")?.[4] ?? "",
                  ) ?? [],
              ) ?? [],
          )
          .filter(Boolean)
          .slice(0, 3) ?? [];

      // Check if this CVE is relevant to user's scans
      const descLower = description.toLowerCase();

      const isRelevant =
        (foundCategories.has("cors") &&
          (descLower.includes("cors") || descLower.includes("cross-origin"))) ||
        (foundCategories.has("ssl") &&
          (descLower.includes("ssl") ||
            descLower.includes("tls") ||
            descLower.includes("certificate"))) ||
        (foundCategories.has("ssrf") &&
          (descLower.includes("ssrf") ||
            descLower.includes("server-side request forgery"))) ||
        (foundCategories.has("clickjacking") &&
          (descLower.includes("clickjack") || descLower.includes("x-frame"))) ||
        (foundCategories.has("idor") &&
          (descLower.includes("access control") ||
            descLower.includes("authorization bypass") ||
            descLower.includes("privilege escalation"))) ||
        (foundCategories.has("file upload") &&
          (descLower.includes("file upload") ||
            descLower.includes("unrestricted upload") ||
            descLower.includes("arbitrary file"))) ||
        (foundCategories.has("exposure") &&
          (descLower.includes("sensitive data") ||
            descLower.includes("information exposure"))) ||
        (foundCategories.has("information disclosure") &&
          (descLower.includes("information disclosure") ||
            descLower.includes("sensitive information"))) ||
        (foundCategories.has("ssti") &&
          (descLower.includes("template injection") ||
            descLower.includes("server-side template"))) ||
        weaknesses.some(
          (w: string) =>
            w.includes("CWE-79") || // XSS
            w.includes("CWE-89") || // SQLi
            w.includes("CWE-22") || // Path traversal
            w.includes("CWE-352") || // CSRF
            w.includes("CWE-601") || // Open redirect
            w.includes("CWE-918") || // SSRF
            w.includes("CWE-434") || // Unrestricted upload
            w.includes("CWE-200"), // Info disclosure
        );

      return {
        id: cve.id,
        description:
          description.length > 200
            ? description.substring(0, 200) + "..."
            : description,
        score,
        severity: severity.toUpperCase(),
        published: cve.published,
        modified: cve.lastModified,
        weaknesses,
        affectedProducts,
        url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
        isRelevant,
        relevantTargets: isRelevant ? scannedTargets.slice(0, 3) : [],
      };
    });

    // Sort — relevant ones first
    feed.sort((a: any, b: any) => {
      if (a.isRelevant && !b.isRelevant) return -1;
      if (!a.isRelevant && b.isRelevant) return 1;
      return b.score - a.score;
    });

    return NextResponse.json({ feed, scannedTargets });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch CVE data" },
      { status: 500 },
    );
  }
}
