import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeScan } from "@/lib/ai-analysis";

export async function POST(req: Request) {
  try {
    const { scanId, vulnerabilities, attackChains } = await req.json();

    // Save vulnerabilities
    if (vulnerabilities.length > 0) {
      await prisma.vulnerability.createMany({
        data: vulnerabilities.map((v: any) => ({
          scanId,
          title: v.title,
          description: v.description,
          severity: v.severity,
          category: v.category,
          evidence: v.evidence,
          fix: v.fix,
          verified: v.verified ?? true,
          confidence: v.confidence ?? "MEDIUM",
          verificationNote: v.verification_note ?? null,
          exploited: v.exploited ?? false,
          poc: v.poc ?? null,
          extractedData: v.extracted_data ?? null,
        })),
      });
    }

    // Save attack chains
    if (attackChains && attackChains.length > 0) {
      await prisma.attackChain.createMany({
        data: attackChains.map((chain: any) => ({
          scanId,
          chainId: chain.id,
          name: chain.name,
          severity: chain.severity,
          description: chain.description,
          attackSteps: JSON.stringify(chain.attack_steps ?? []),
          cvss: chain.cvss ?? 0,
          remediation: chain.remediation ?? "",
          involvedVulnerabilities: JSON.stringify(
            chain.involved_vulnerabilities ?? [],
          ),
          aiNarrative: chain.ai_narrative ?? "",
        })),
      });
    }

    // Get target URL for AI analysis
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
    });

    // Run AI analysis
    let aiResult = null;
    if (vulnerabilities.length > 0 && scan) {
      aiResult = await analyzeScan(vulnerabilities, scan.targetUrl);
    }

    // Save report
    if (aiResult) {
      await prisma.report.create({
        data: {
          scanId,
          summary: aiResult.executiveSummary,
          score: aiResult.securityScore,
        },
      });
    }

    // Update scan status
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
