import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groq } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUrl } = await req.json();
  if (!targetUrl) {
    return NextResponse.json({ error: "Target URL required" }, { status: 400 });
  }

  // Get all past scans with vulnerabilities
  const pastScans = await prisma.scan.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    include: { vulnerabilities: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (pastScans.length === 0) {
    return NextResponse.json({
      predictions: [],
      message:
        "No past scans found. Run some scans first to enable predictions.",
    });
  }

  // Build pattern analysis
  const totalScans = pastScans.length;
  const vulnFrequency: Record<
    string,
    { count: number; severities: string[]; categories: string[] }
  > = {};

  pastScans.forEach((scan) => {
    scan.vulnerabilities.forEach((vuln) => {
      const key = vuln.title;
      if (!vulnFrequency[key]) {
        vulnFrequency[key] = { count: 0, severities: [], categories: [] };
      }
      vulnFrequency[key].count++;
      vulnFrequency[key].severities.push(vuln.severity);
      vulnFrequency[key].categories.push(vuln.category);
    });
  });

  // Calculate base probabilities from historical data
  const basePredictions = Object.entries(vulnFrequency)
    .map(([title, data]) => ({
      title,
      frequency: data.count / totalScans,
      severity: data.severities[0],
      category: data.categories[0],
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Use Groq AI to refine predictions based on target URL
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a security expert analyzing vulnerability patterns. 
Return ONLY valid JSON, no markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Target URL: ${targetUrl}

Based on historical scan data, these vulnerabilities were found across ${totalScans} previous scans:
${basePredictions.map((p) => `- ${p.title} (found in ${Math.round(p.frequency * 100)}% of scans, ${p.severity})`).join("\n")}

Analyze the target URL "${targetUrl}" and predict which vulnerabilities are most likely present.
Consider the domain, TLD, URL structure, and typical security posture of similar sites.

Return this exact JSON structure:
{
  "predictions": [
    {
      "title": "vulnerability name",
      "confidence": 85,
      "severity": "HIGH",
      "category": "Headers",
      "reason": "one sentence explanation"
    }
  ],
  "targetAnalysis": "2 sentence analysis of the target's likely security posture"
}

Include 5-8 predictions. Confidence should be 40-95 (never 100).`,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const content = response.choices[0].message.content!;
  const clean = content.replace(/```json|```/g, "").trim();

  try {
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      predictions: basePredictions.map((p) => ({
        title: p.title,
        confidence: Math.round(p.frequency * 100),
        severity: p.severity,
        category: p.category,
        reason: `Found in ${Math.round(p.frequency * 100)}% of your previous scans.`,
      })),
      targetAnalysis: "Analysis based on historical scan patterns.",
    });
  }
}
