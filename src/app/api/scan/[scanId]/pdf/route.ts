import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { vulnerabilities: true, report: true },
  });

  if (!scan || scan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const obliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const W = 595;
  const H = 842;

  // ── COLOR PALETTE ──
  const c = {
    // Dark theme
    darkBg: rgb(0.02, 0.02, 0.05),
    darkCard: rgb(0.05, 0.05, 0.08),
    emerald: rgb(0.06, 0.73, 0.51),
    emeraldDim: rgb(0.04, 0.45, 0.32),
    // Light theme
    white: rgb(1, 1, 1),
    lightBg: rgb(0.97, 0.97, 0.98),
    lightCard: rgb(0.93, 0.93, 0.95),
    border: rgb(0.88, 0.88, 0.9),
    // Text
    textDark: rgb(0.1, 0.1, 0.12),
    textMid: rgb(0.35, 0.35, 0.4),
    textLight: rgb(0.6, 0.6, 0.65),
    // Severity
    critical: rgb(0.86, 0.15, 0.15),
    criticalBg: rgb(0.99, 0.93, 0.93),
    high: rgb(0.9, 0.4, 0.05),
    highBg: rgb(0.99, 0.95, 0.9),
    medium: rgb(0.8, 0.6, 0.0),
    mediumBg: rgb(0.99, 0.97, 0.88),
    low: rgb(0.15, 0.45, 0.85),
    lowBg: rgb(0.9, 0.93, 0.99),
    info: rgb(0.4, 0.4, 0.45),
    infoBg: rgb(0.94, 0.94, 0.95),
  };

  function getSeverityColors(severity: string) {
    switch (severity) {
      case "CRITICAL":
        return { main: c.critical, bg: c.criticalBg, label: "CRITICAL" };
      case "HIGH":
        return { main: c.high, bg: c.highBg, label: "HIGH" };
      case "MEDIUM":
        return { main: c.medium, bg: c.mediumBg, label: "MEDIUM" };
      case "LOW":
        return { main: c.low, bg: c.lowBg, label: "LOW" };
      default:
        return { main: c.info, bg: c.infoBg, label: "INFO" };
    }
  }

  const score = scan.report?.score ?? 0;
  const riskColor =
    score >= 70 ? c.emerald : score >= 40 ? c.medium : c.critical;
  const riskLabel =
    score >= 70 ? "LOW RISK" : score >= 40 ? "MEDIUM RISK" : "CRITICAL RISK";

  const criticalCount = scan.vulnerabilities.filter(
    (v) => v.severity === "CRITICAL",
  ).length;
  const highCount = scan.vulnerabilities.filter(
    (v) => v.severity === "HIGH",
  ).length;
  const mediumCount = scan.vulnerabilities.filter(
    (v) => v.severity === "MEDIUM",
  ).length;
  const lowCount = scan.vulnerabilities.filter(
    (v) => v.severity === "LOW",
  ).length;

  // ── HELPER: wrap text ──
  function wrapText(
    text: string,
    font: any,
    size: number,
    maxWidth: number,
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── HELPER: draw text block ──
  function drawTextBlock(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    options: {
      font: any;
      size: number;
      color: any;
      maxWidth: number;
      lineHeight?: number;
    },
  ): number {
    const lines = wrapText(text, options.font, options.size, options.maxWidth);
    const lh = options.lineHeight ?? options.size * 1.5;
    lines.forEach((line, i) => {
      page.drawText(line, {
        x,
        y: y - i * lh,
        size: options.size,
        font: options.font,
        color: options.color,
      });
    });
    return lines.length * lh;
  }

  // ── HELPER: light page ──
  function addLightPage(): PDFPage {
    const page = pdfDoc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c.white });
    // Top accent bar
    page.drawRectangle({
      x: 0,
      y: H - 6,
      width: W,
      height: 6,
      color: c.emerald,
    });
    // Left sidebar accent
    page.drawRectangle({ x: 0, y: 0, width: 4, height: H, color: c.emerald });
    // Header area
    page.drawRectangle({
      x: 0,
      y: H - 50,
      width: W,
      height: 44,
      color: c.lightBg,
    });
    // Header logo text
    page.drawText("VulnScope", {
      x: 20,
      y: H - 32,
      size: 11,
      font: boldFont,
      color: c.emerald,
    });
    page.drawText("Security Report", {
      x: 20,
      y: H - 44,
      size: 7,
      font: regularFont,
      color: c.textLight,
    });
    // Page footer
    page.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: c.lightBg });
    page.drawRectangle({ x: 0, y: 28, width: W, height: 1, color: c.border });
    page.drawText("CONFIDENTIAL — VulnScope Automated Security Report", {
      x: 20,
      y: 10,
      size: 7,
      font: regularFont,
      color: c.textLight,
    });
    page.drawText(
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      {
        x: 460,
        y: 10,
        size: 7,
        font: regularFont,
        color: c.textLight,
      },
    );
    return page;
  }

  // ══════════════════════════════════════════
  // PAGE 1 — DARK COVER
  // ══════════════════════════════════════════

  const cover = pdfDoc.addPage([W, H]);

  // Background
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c.darkBg });

  // Top emerald bar
  cover.drawRectangle({
    x: 0,
    y: H - 6,
    width: W,
    height: 6,
    color: c.emerald,
  });

  // Left accent bar
  cover.drawRectangle({ x: 0, y: 0, width: 5, height: H, color: c.emerald });

  // Subtle dot grid (light, not distracting)
  for (let x = 40; x < W; x += 40) {
    for (let y = 40; y < H; y += 40) {
      cover.drawCircle({ x, y, size: 0.8, color: rgb(1, 1, 1) });
    }
  }

  // ── Logo row ──
  cover.drawRectangle({
    x: 20,
    y: H - 80,
    width: 44,
    height: 44,
    color: c.emeraldDim,
  });
  cover.drawText("VS", {
    x: 33,
    y: H - 63,
    size: 18,
    font: boldFont,
    color: c.white,
  });
  cover.drawText("VulnScope", {
    x: 74,
    y: H - 58,
    size: 20,
    font: boldFont,
    color: c.white,
  });
  cover.drawText("AI-POWERED SECURITY PLATFORM", {
    x: 76,
    y: H - 73,
    size: 7,
    font: regularFont,
    color: c.emerald,
  });

  // Divider under logo
  cover.drawRectangle({
    x: 20,
    y: H - 95,
    width: 555,
    height: 1,
    color: c.emeraldDim,
  });

  // ── Title ──
  cover.drawText("PENETRATION", {
    x: 20,
    y: H - 210,
    size: 48,
    font: boldFont,
    color: c.white,
  });
  cover.drawText("TEST REPORT", {
    x: 20,
    y: H - 265,
    size: 48,
    font: boldFont,
    color: c.emerald,
  });
  cover.drawText("Automated Web Application Security Assessment", {
    x: 20,
    y: H - 292,
    size: 10,
    font: obliqueFont,
    color: rgb(0.55, 0.55, 0.6),
  });

  // Divider
  cover.drawRectangle({
    x: 20,
    y: H - 308,
    width: 555,
    height: 1,
    color: c.emeraldDim,
  });

  // ── Target Info Box ──
  cover.drawRectangle({
    x: 20,
    y: H - 390,
    width: 555,
    height: 74,
    color: c.darkCard,
  });
  cover.drawRectangle({
    x: 20,
    y: H - 390,
    width: 4,
    height: 74,
    color: c.emerald,
  });

  cover.drawText("TARGET URL", {
    x: 34,
    y: H - 328,
    size: 7,
    font: boldFont,
    color: c.emerald,
  });
  const targetText =
    scan.targetUrl.length > 60
      ? scan.targetUrl.substring(0, 60) + "..."
      : scan.targetUrl;
  cover.drawText(targetText, {
    x: 34,
    y: H - 345,
    size: 12,
    font: boldFont,
    color: c.white,
  });
  cover.drawText("SCAN DATE", {
    x: 34,
    y: H - 365,
    size: 7,
    font: boldFont,
    color: rgb(0.45, 0.45, 0.5),
  });
  cover.drawText(
    new Date(scan.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    {
      x: 34,
      y: H - 380,
      size: 10,
      font: regularFont,
      color: rgb(0.7, 0.7, 0.75),
    },
  );

  // ── Score + Risk Row ──
  // Score box
  cover.drawRectangle({
    x: 20,
    y: H - 480,
    width: 140,
    height: 78,
    color: c.darkCard,
  });
  cover.drawRectangle({
    x: 20,
    y: H - 408,
    width: 140,
    height: 3,
    color: riskColor,
  });
  cover.drawText("SECURITY SCORE", {
    x: 30,
    y: H - 426,
    size: 7,
    font: boldFont,
    color: rgb(0.45, 0.45, 0.5),
  });
  cover.drawText(`${score}`, {
    x: score >= 100 ? 42 : score >= 10 ? 50 : 60,
    y: H - 460,
    size: 34,
    font: boldFont,
    color: riskColor,
  });
  cover.drawText("/ 100", {
    x: 90,
    y: H - 450,
    size: 11,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.45),
  });
  cover.drawText(riskLabel, {
    x: 30,
    y: H - 474,
    size: 8,
    font: boldFont,
    color: riskColor,
  });

  // Risk details box
  cover.drawRectangle({
    x: 172,
    y: H - 480,
    width: 403,
    height: 78,
    color: c.darkCard,
  });
  cover.drawRectangle({
    x: 172,
    y: H - 408,
    width: 403,
    height: 3,
    color: riskColor,
  });
  cover.drawText("RISK SUMMARY", {
    x: 184,
    y: H - 426,
    size: 7,
    font: boldFont,
    color: rgb(0.45, 0.45, 0.5),
  });

  const riskSummary =
    score >= 70
      ? "The target has a good security posture with minor issues to address."
      : score >= 40
        ? "The target has moderate security issues requiring prompt attention."
        : "The target has critical vulnerabilities requiring immediate remediation.";

  const riskLines = wrapText(riskSummary, regularFont, 9, 370);
  riskLines.forEach((line, i) => {
    cover.drawText(line, {
      x: 184,
      y: H - 444 - i * 14,
      size: 9,
      font: regularFont,
      color: rgb(0.65, 0.65, 0.7),
    });
  });

  // ── Severity Count Row ──
  const sevBoxes = [
    { label: "CRITICAL", count: criticalCount, color: c.critical, x: 20 },
    { label: "HIGH", count: highCount, color: c.high, x: 160 },
    { label: "MEDIUM", count: mediumCount, color: c.medium, x: 300 },
    { label: "LOW", count: lowCount, color: c.low, x: 440 },
  ];

  sevBoxes.forEach((box) => {
    cover.drawRectangle({
      x: box.x,
      y: H - 580,
      width: 130,
      height: 84,
      color: c.darkCard,
    });
    cover.drawRectangle({
      x: box.x,
      y: H - 500,
      width: 130,
      height: 4,
      color: box.color,
    });
    cover.drawText(box.count.toString(), {
      x: box.x + (box.count >= 10 ? 42 : 50),
      y: H - 550,
      size: 30,
      font: boldFont,
      color: box.color,
    });
    cover.drawText(box.label, {
      x: box.x + (box.label.length > 6 ? 30 : 38),
      y: H - 572,
      size: 8,
      font: boldFont,
      color: rgb(0.45, 0.45, 0.5),
    });
  });

  // ── Confidential Footer ──
  cover.drawRectangle({ x: 0, y: 0, width: W, height: 46, color: c.darkCard });
  cover.drawRectangle({
    x: 0,
    y: 46,
    width: W,
    height: 1,
    color: c.emeraldDim,
  });
  cover.drawText("CONFIDENTIAL", {
    x: 20,
    y: 28,
    size: 9,
    font: boldFont,
    color: c.emerald,
  });
  cover.drawText(
    "This report contains sensitive security information. Authorized personnel only.",
    {
      x: 20,
      y: 14,
      size: 7,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.5),
    },
  );
  cover.drawText("Generated by VulnScope", {
    x: 440,
    y: 20,
    size: 8,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.4),
  });

  // ══════════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ══════════════════════════════════════════
  const summaryPage = addLightPage();
  let sy = H - 75;

  summaryPage.drawText("Executive Summary", {
    x: 30,
    y: sy,
    size: 20,
    font: boldFont,
    color: c.textDark,
  });
  sy -= 8;
  summaryPage.drawRectangle({
    x: 30,
    y: sy,
    width: 50,
    height: 2,
    color: c.emerald,
  });
  sy -= 24;

  // AI Summary box
  if (scan.report?.summary) {
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 80,
      width: 535,
      height: 90,
      color: c.lightBg,
    });
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 80,
      width: 3,
      height: 90,
      color: c.emerald,
    });

    summaryPage.drawText("AI ANALYSIS", {
      x: 42,
      y: sy - 14,
      size: 7,
      font: boldFont,
      color: c.emerald,
    });

    const summaryLines = wrapText(scan.report.summary, regularFont, 10, 490);
    summaryLines.slice(0, 4).forEach((line, i) => {
      summaryPage.drawText(line, {
        x: 42,
        y: sy - 28 - i * 15,
        size: 10,
        font: regularFont,
        color: c.textMid,
      });
    });
    sy -= 106;
  }

  // Security score visual
  sy -= 10;
  summaryPage.drawText("Security Assessment", {
    x: 30,
    y: sy,
    size: 14,
    font: boldFont,
    color: c.textDark,
  });
  sy -= 24;

  // Score bar
  summaryPage.drawRectangle({
    x: 30,
    y: sy - 20,
    width: 355,
    height: 20,
    color: c.lightCard,
  });
  summaryPage.drawRectangle({
    x: 30,
    y: sy - 20,
    width: Math.floor((355 * score) / 100),
    height: 20,
    color: riskColor,
  });
  summaryPage.drawText(`${score}/100`, {
    x: 395,
    y: sy - 14,
    size: 12,
    font: boldFont,
    color: riskColor,
  });
  summaryPage.drawText(riskLabel, {
    x: 450,
    y: sy - 14,
    size: 9,
    font: boldFont,
    color: riskColor,
  });
  sy -= 40;

  // Severity table
  summaryPage.drawText("Findings by Severity", {
    x: 30,
    y: sy,
    size: 14,
    font: boldFont,
    color: c.textDark,
  });
  sy -= 20;

  // Table header
  summaryPage.drawRectangle({
    x: 30,
    y: sy - 22,
    width: 535,
    height: 22,
    color: c.textDark,
  });
  summaryPage.drawText("SEVERITY", {
    x: 42,
    y: sy - 14,
    size: 8,
    font: boldFont,
    color: c.white,
  });
  summaryPage.drawText("COUNT", {
    x: 200,
    y: sy - 14,
    size: 8,
    font: boldFont,
    color: c.white,
  });
  summaryPage.drawText("RISK LEVEL", {
    x: 320,
    y: sy - 14,
    size: 8,
    font: boldFont,
    color: c.white,
  });
  summaryPage.drawText("PRIORITY", {
    x: 460,
    y: sy - 14,
    size: 8,
    font: boldFont,
    color: c.white,
  });
  sy -= 22;

  const tableRows = [
    {
      sev: "CRITICAL",
      count: criticalCount,
      risk: "Immediate Action",
      priority: "P1",
      colors: { main: c.critical, bg: c.criticalBg },
    },
    {
      sev: "HIGH",
      count: highCount,
      risk: "Fix Within 24h",
      priority: "P2",
      colors: { main: c.high, bg: c.highBg },
    },
    {
      sev: "MEDIUM",
      count: mediumCount,
      risk: "Fix Within 7 Days",
      priority: "P3",
      colors: { main: c.medium, bg: c.mediumBg },
    },
    {
      sev: "LOW",
      count: lowCount,
      risk: "Fix Within 30 Days",
      priority: "P4",
      colors: { main: c.low, bg: c.lowBg },
    },
  ];

  tableRows.forEach((row, i) => {
    const rowBg = i % 2 === 0 ? c.white : c.lightBg;
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 22,
      width: 535,
      height: 22,
      color: rowBg,
    });
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 22,
      width: 6,
      height: 22,
      color: row.colors.main,
    });
    summaryPage.drawText(row.sev, {
      x: 44,
      y: sy - 14,
      size: 9,
      font: boldFont,
      color: row.colors.main,
    });
    summaryPage.drawText(row.count.toString(), {
      x: 205,
      y: sy - 14,
      size: 9,
      font: boldFont,
      color: c.textDark,
    });
    summaryPage.drawText(row.risk, {
      x: 320,
      y: sy - 14,
      size: 9,
      font: regularFont,
      color: c.textMid,
    });
    summaryPage.drawText(row.priority, {
      x: 470,
      y: sy - 14,
      size: 9,
      font: boldFont,
      color: row.colors.main,
    });
    sy -= 22;
  });

  // Border around table
  summaryPage.drawRectangle({
    x: 30,
    y: sy,
    width: 535,
    height: 1,
    color: c.border,
  });
  sy -= 30;

  // Total
  summaryPage.drawText(
    `Total Vulnerabilities Found: ${scan.vulnerabilities.length}`,
    {
      x: 30,
      y: sy,
      size: 11,
      font: boldFont,
      color: c.textDark,
    },
  );
  sy -= 30;

  // Key findings
  summaryPage.drawText("Key Findings", {
    x: 30,
    y: sy,
    size: 14,
    font: boldFont,
    color: c.textDark,
  });
  sy -= 8;
  summaryPage.drawRectangle({
    x: 30,
    y: sy,
    width: 50,
    height: 2,
    color: c.emerald,
  });
  sy -= 20;

  const topVulns = scan.vulnerabilities
    .sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
      return (
        (order[a.severity as keyof typeof order] ?? 5) -
        (order[b.severity as keyof typeof order] ?? 5)
      );
    })
    .slice(0, 4);

  topVulns.forEach((vuln, i) => {
    const sc = getSeverityColors(vuln.severity);
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 32,
      width: 535,
      height: 34,
      color: sc.bg,
    });
    summaryPage.drawRectangle({
      x: 30,
      y: sy - 32,
      width: 4,
      height: 34,
      color: sc.main,
    });

    summaryPage.drawText(`${i + 1}.`, {
      x: 42,
      y: sy - 12,
      size: 9,
      font: boldFont,
      color: sc.main,
    });
    summaryPage.drawText(vuln.title.substring(0, 55), {
      x: 58,
      y: sy - 12,
      size: 9,
      font: boldFont,
      color: c.textDark,
    });
    summaryPage.drawText(sc.label, {
      x: 490,
      y: sy - 12,
      size: 8,
      font: boldFont,
      color: sc.main,
    });

    const descLines = wrapText(vuln.description, regularFont, 8, 430);
    summaryPage.drawText(descLines[0] ?? "", {
      x: 58,
      y: sy - 24,
      size: 8,
      font: regularFont,
      color: c.textMid,
    });
    sy -= 42;
  });

  // ══════════════════════════════════════════
  // PAGE 3+ — VULNERABILITY DETAILS
  // ══════════════════════════════════════════
  if (scan.vulnerabilities.length > 0) {
    let vulnPage = addLightPage();
    let vy = H - 75;
    let isFirstOnPage = true;

    vulnPage.drawText("Vulnerability Details", {
      x: 30,
      y: vy,
      size: 20,
      font: boldFont,
      color: c.textDark,
    });
    vy -= 8;
    vulnPage.drawRectangle({
      x: 30,
      y: vy,
      width: 80,
      height: 2,
      color: c.emerald,
    });
    vy -= 24;

    const sortedVulns = [...scan.vulnerabilities].sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
      return (
        (order[a.severity as keyof typeof order] ?? 5) -
        (order[b.severity as keyof typeof order] ?? 5)
      );
    });

    sortedVulns.forEach((vuln, idx) => {
      const sc = getSeverityColors(vuln.severity);

      // Estimate card height
      const descLines = wrapText(vuln.description, regularFont, 9, 480);
      const evidenceLines = vuln.evidence
        ? wrapText(vuln.evidence, regularFont, 8, 460)
        : [];
      const fixLines = vuln.fix ? wrapText(vuln.fix, regularFont, 9, 480) : [];
      const estimatedHeight =
        45 +
        descLines.length * 13 +
        (evidenceLines.length > 0 ? 30 + evidenceLines.length * 12 : 0) +
        (fixLines.length > 0 ? 30 + fixLines.length * 13 : 0) +
        20;

      // New page if needed
      if (vy - estimatedHeight < 60 && !isFirstOnPage) {
        vulnPage = addLightPage();
        vy = H - 75;
        vulnPage.drawText("Vulnerability Details (continued)", {
          x: 30,
          y: vy,
          size: 14,
          font: boldFont,
          color: c.textDark,
        });
        vy -= 8;
        vulnPage.drawRectangle({
          x: 30,
          y: vy,
          width: 80,
          height: 2,
          color: c.emerald,
        });
        vy -= 24;
      }
      isFirstOnPage = false;

      const cardTop = vy;
      const cardHeight = estimatedHeight;

      // Card background
      vulnPage.drawRectangle({
        x: 30,
        y: cardTop - cardHeight,
        width: 535,
        height: cardHeight,
        color: c.lightBg,
      });
      vulnPage.drawRectangle({
        x: 30,
        y: cardTop - cardHeight,
        width: 1,
        height: cardHeight,
        color: c.border,
      });
      vulnPage.drawRectangle({
        x: 564,
        y: cardTop - cardHeight,
        width: 1,
        height: cardHeight,
        color: c.border,
      });
      vulnPage.drawRectangle({
        x: 30,
        y: cardTop,
        width: 535,
        height: 1,
        color: c.border,
      });
      vulnPage.drawRectangle({
        x: 30,
        y: cardTop - cardHeight,
        width: 535,
        height: 1,
        color: c.border,
      });

      // Severity left bar
      vulnPage.drawRectangle({
        x: 30,
        y: cardTop - cardHeight,
        width: 5,
        height: cardHeight,
        color: sc.main,
      });

      // Header row
      vulnPage.drawRectangle({
        x: 35,
        y: cardTop - 28,
        width: 530,
        height: 28,
        color: sc.bg,
      });

      // Index number
      vulnPage.drawText(`#${idx + 1}`, {
        x: 42,
        y: cardTop - 18,
        size: 8,
        font: boldFont,
        color: sc.main,
      });

      // Title
      vulnPage.drawText(vuln.title.substring(0, 60), {
        x: 62,
        y: cardTop - 18,
        size: 10,
        font: boldFont,
        color: c.textDark,
      });

      // Severity badge
      const badgeW = sc.label.length * 6 + 12;
      vulnPage.drawRectangle({
        x: 564 - badgeW - 6,
        y: cardTop - 24,
        width: badgeW,
        height: 16,
        color: sc.main,
      });
      vulnPage.drawText(sc.label, {
        x: 564 - badgeW,
        y: cardTop - 17,
        size: 7,
        font: boldFont,
        color: c.white,
      });

      // Category tag
      vulnPage.drawText(`Category: ${vuln.category}`, {
        x: 62,
        y: cardTop - 38,
        size: 7,
        font: regularFont,
        color: c.textLight,
      });

      let cy = cardTop - 52;

      // Description
      vulnPage.drawText("Description", {
        x: 42,
        y: cy,
        size: 8,
        font: boldFont,
        color: c.textDark,
      });
      cy -= 13;
      descLines.forEach((line) => {
        vulnPage.drawText(line, {
          x: 42,
          y: cy,
          size: 9,
          font: regularFont,
          color: c.textMid,
        });
        cy -= 13;
      });
      cy -= 4;

      // Evidence
      if (evidenceLines.length > 0) {
        vulnPage.drawText("Evidence", {
          x: 42,
          y: cy,
          size: 8,
          font: boldFont,
          color: c.textDark,
        });
        cy -= 13;
        vulnPage.drawRectangle({
          x: 42,
          y: cy - evidenceLines.length * 12 - 4,
          width: 515,
          height: evidenceLines.length * 12 + 8,
          color: rgb(0.92, 0.92, 0.94),
        });
        evidenceLines.forEach((line) => {
          vulnPage.drawText(line, {
            x: 48,
            y: cy,
            size: 8,
            font: obliqueFont,
            color: c.textMid,
          });
          cy -= 12;
        });
        cy -= 8;
      }

      // Recommendation
      if (fixLines.length > 0) {
        vulnPage.drawRectangle({
          x: 42,
          y: cy - fixLines.length * 13 - 18,
          width: 515,
          height: fixLines.length * 13 + 22,
          color: rgb(0.92, 0.98, 0.95),
        });
        vulnPage.drawRectangle({
          x: 42,
          y: cy - fixLines.length * 13 - 18,
          width: 3,
          height: fixLines.length * 13 + 22,
          color: c.emerald,
        });
        vulnPage.drawText("Recommendation", {
          x: 50,
          y: cy,
          size: 8,
          font: boldFont,
          color: c.emerald,
        });
        cy -= 14;
        fixLines.forEach((line) => {
          vulnPage.drawText(line, {
            x: 50,
            y: cy,
            size: 9,
            font: regularFont,
            color: c.textMid,
          });
          cy -= 13;
        });
      }

      vy = cardTop - cardHeight - 16;
    });

    // ══════════════════════════════════════════
    // LAST PAGE — CONCLUSION
    // ══════════════════════════════════════════
    const conclusionPage = addLightPage();
    let cy2 = H - 75;

    conclusionPage.drawText("Conclusion & Recommendations", {
      x: 30,
      y: cy2,
      size: 20,
      font: boldFont,
      color: c.textDark,
    });
    cy2 -= 8;
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2,
      width: 80,
      height: 2,
      color: c.emerald,
    });
    cy2 -= 30;

    // Overall posture
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2 - 70,
      width: 535,
      height: 75,
      color: c.lightBg,
    });
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2 - 70,
      width: 4,
      height: 75,
      color: riskColor,
    });
    conclusionPage.drawText("Overall Security Posture", {
      x: 42,
      y: cy2 - 16,
      size: 11,
      font: boldFont,
      color: c.textDark,
    });
    conclusionPage.drawText(`Security Score: ${score}/100 — ${riskLabel}`, {
      x: 42,
      y: cy2 - 32,
      size: 10,
      font: regularFont,
      color: riskColor,
    });
    conclusionPage.drawText(
      `Total vulnerabilities found: ${scan.vulnerabilities.length} (${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low)`,
      {
        x: 42,
        y: cy2 - 48,
        size: 9,
        font: regularFont,
        color: c.textMid,
      },
    );
    conclusionPage.drawText(`Target: ${scan.targetUrl}`, {
      x: 42,
      y: cy2 - 62,
      size: 9,
      font: regularFont,
      color: c.textMid,
    });
    cy2 -= 94;

    // Priority action items
    conclusionPage.drawText("Priority Action Items", {
      x: 30,
      y: cy2,
      size: 14,
      font: boldFont,
      color: c.textDark,
    });
    cy2 -= 8;
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2,
      width: 80,
      height: 2,
      color: c.emerald,
    });
    cy2 -= 20;

    const actionItems = [
      {
        priority: "P1 — Immediate",
        items: scan.vulnerabilities.filter((v) => v.severity === "CRITICAL"),
        color: c.critical,
      },
      {
        priority: "P2 — Within 24 Hours",
        items: scan.vulnerabilities.filter((v) => v.severity === "HIGH"),
        color: c.high,
      },
      {
        priority: "P3 — Within 7 Days",
        items: scan.vulnerabilities.filter((v) => v.severity === "MEDIUM"),
        color: c.medium,
      },
      {
        priority: "P4 — Within 30 Days",
        items: scan.vulnerabilities.filter((v) => v.severity === "LOW"),
        color: c.low,
      },
    ].filter((a) => a.items.length > 0);

    actionItems.forEach((action) => {
      conclusionPage.drawText(action.priority, {
        x: 30,
        y: cy2,
        size: 10,
        font: boldFont,
        color: action.color,
      });
      cy2 -= 16;
      action.items.slice(0, 3).forEach((item) => {
        conclusionPage.drawText(`• ${item.title.substring(0, 70)}`, {
          x: 42,
          y: cy2,
          size: 9,
          font: regularFont,
          color: c.textMid,
        });
        cy2 -= 14;
      });
      if (action.items.length > 3) {
        conclusionPage.drawText(`  ...and ${action.items.length - 3} more`, {
          x: 42,
          y: cy2,
          size: 8,
          font: obliqueFont,
          color: c.textLight,
        });
        cy2 -= 14;
      }
      cy2 -= 8;
    });

    // Generated by box
    cy2 = 80;
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2 - 40,
      width: 535,
      height: 50,
      color: c.lightBg,
    });
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2 + 10,
      width: 535,
      height: 1,
      color: c.border,
    });
    conclusionPage.drawRectangle({
      x: 30,
      y: cy2 - 40,
      width: 535,
      height: 1,
      color: c.border,
    });
    conclusionPage.drawText(
      "This report was automatically generated by VulnScope AI Security Platform.",
      {
        x: 42,
        y: cy2 - 10,
        size: 8,
        font: regularFont,
        color: c.textLight,
      },
    );
    conclusionPage.drawText(
      "Results should be verified by a qualified security professional before remediation.",
      {
        x: 42,
        y: cy2 - 24,
        size: 8,
        font: regularFont,
        color: c.textLight,
      },
    );
    conclusionPage.drawText("vulnscope.app", {
      x: 460,
      y: cy2 - 16,
      size: 9,
      font: boldFont,
      color: c.emerald,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vulnscope-pentest-report-${scanId}.pdf"`,
    },
  });
}
