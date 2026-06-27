import { groq } from "./groq";

export async function analyzeScan(vulnerabilities: any[], targetUrl: string) {
  const vulnSummary = vulnerabilities
    .map(
      (v) =>
        `- [${v.severity}] ${v.title}: ${v.description} (Category: ${v.category})`,
    )
    .join("\n");

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a senior penetration tester writing professional security reports. 
Be concise, technical, and actionable. Always respond in valid JSON only.`,
      },
      {
        role: "user",
        content: `Analyze these vulnerabilities found on ${targetUrl}:

${vulnSummary}

Respond with this exact JSON structure:
{
  "executiveSummary": "2-3 sentence summary for non-technical stakeholders",
  "securityScore": <number 0-100, lower is worse>,
  "riskLevel": "CRITICAL | HIGH | MEDIUM | LOW",
  "topPriorities": ["priority 1", "priority 2", "priority 3"],
  "conclusion": "1-2 sentence closing statement"
}`,
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content!;
  const clean = content.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
