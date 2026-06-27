import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Shield, CheckCircle, Clock, AlertTriangle, Globe } from "lucide-react";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    include: { vulnerabilities: true, report: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-zinc-500 mt-1">All your previous scan reports</p>
      </div>

      {scans.length === 0 ? (
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No scans yet</p>
          <p className="text-zinc-600 text-sm mt-1">
            Start a scan to see reports here
          </p>
          <Link
            href="/dashboard/scan"
            className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            New Scan
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => {
            const criticalCount = scan.vulnerabilities.filter(
              (v) => v.severity === "CRITICAL",
            ).length;
            const highCount = scan.vulnerabilities.filter(
              (v) => v.severity === "HIGH",
            ).length;

            return (
              <Link key={scan.id} href={`/dashboard/reports/${scan.id}`}>
                <div className="bg-[#0d0d14] border border-white/[0.06] hover:border-emerald-500/20 rounded-2xl p-5 transition-all cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/[0.04] rounded-xl p-2">
                        <Globe className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {scan.targetUrl}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {new Date(scan.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Severity badges */}
                      <div className="hidden md:flex items-center gap-2">
                        {criticalCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                            {criticalCount} Critical
                          </span>
                        )}
                        {highCount > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                            {highCount} High
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      {scan.report && (
                        <div
                          className={`text-sm font-bold px-3 py-1 rounded-xl ${
                            scan.report.score >= 70
                              ? "bg-emerald-500/10 text-emerald-400"
                              : scan.report.score >= 40
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {scan.report.score}/100
                        </div>
                      )}

                      {/* Status */}
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          scan.status === "COMPLETED"
                            ? "text-emerald-400"
                            : scan.status === "RUNNING"
                              ? "text-blue-400"
                              : "text-red-400"
                        }`}
                      >
                        {scan.status === "COMPLETED" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : scan.status === "RUNNING" ? (
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {scan.status}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
