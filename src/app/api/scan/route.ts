import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUrl } = await req.json();

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Target URL is required" },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Create scan record
    const scan = await prisma.scan.create({
      data: {
        userId: session.user.id,
        targetUrl,
        status: "RUNNING",
      },
    });

    // Trigger Python scanner in background
    triggerScan(scan.id, targetUrl);

    return NextResponse.json({ scanId: scan.id });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

async function triggerScan(scanId: string, targetUrl: string) {
  try {
    await fetch(`http://localhost:8000/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId, targetUrl }),
    });
  } catch {
    // Scanner not running, mark as failed
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "FAILED" },
    });
  }
}
