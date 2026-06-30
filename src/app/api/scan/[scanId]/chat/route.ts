import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groq } from "@/lib/groq";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await req.json();

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      vulnerabilities: true,
      report: true,
      chatMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!scan || scan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { scanId, role: "user", content: message },
  });

  const vulnSummary = scan.vulnerabilities
    .map((v) => `- [${v.severity}] ${v.title}: ${v.description}`)
    .join("\n");

  const chatHistory = scan.chatMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a senior penetration tester helping a developer understand and fix security vulnerabilities found on ${scan.targetUrl}.

Here are the vulnerabilities found in this scan:
${vulnSummary || "No vulnerabilities found"}

Security Score: ${scan.report?.score ?? "N/A"}/100

Be concise, technical, and helpful. Give specific code examples when asked for fixes. Keep responses under 150 words unless code is needed.`,
      },
      ...chatHistory,
      { role: "user", content: message },
    ],
    temperature: 0.4,
  });

  const aiResponse = response.choices[0].message.content!;

  // Save AI response
  await prisma.chatMessage.create({
    data: { scanId, role: "assistant", content: aiResponse },
  });

  return NextResponse.json({ response: aiResponse });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { scanId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}
