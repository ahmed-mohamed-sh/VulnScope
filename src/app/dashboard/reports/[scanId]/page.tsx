import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReportClient from "./ReportClient";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { vulnerabilities: true, report: true },
  });

  if (!scan || scan.userId !== session.user.id) redirect("/dashboard");

  return <ReportClient initialScan={scan} />;
}
