import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Shield, Search, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";
import DashboardCharts from "./DashboardCharts";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    include: { vulnerabilities: true, report: true },
    orderBy: { createdAt: "asc" },
  });

  const totalScans = scans.length;
  const completedScans = scans.filter((s) => s.status === "COMPLETED").length;
  const totalVulns = scans.reduce(
    (acc, s) => acc + s.vulnerabilities.length,
    0,
  );
  const criticalVulns = scans.reduce(
    (acc, s) =>
      acc + s.vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
    0,
  );

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      scans: scans.filter((s) => {
        const scanDate = new Date(s.createdAt);
        return scanDate.toDateString() === date.toDateString();
      }).length,
      vulns: scans
        .filter((s) => {
          const scanDate = new Date(s.createdAt);
          return scanDate.toDateString() === date.toDateString();
        })
        .reduce((acc, s) => acc + s.vulnerabilities.length, 0),
    };
  });

  const severityData = [
    {
      name: "Critical",
      value: scans.reduce(
        (acc, s) =>
          acc +
          s.vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
        0,
      ),
      color: "#ef4444",
    },
    {
      name: "High",
      value: scans.reduce(
        (acc, s) =>
          acc + s.vulnerabilities.filter((v) => v.severity === "HIGH").length,
        0,
      ),
      color: "#f97316",
    },
    {
      name: "Medium",
      value: scans.reduce(
        (acc, s) =>
          acc + s.vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
        0,
      ),
      color: "#eab308",
    },
    {
      name: "Low",
      value: scans.reduce(
        (acc, s) =>
          acc + s.vulnerabilities.filter((v) => v.severity === "LOW").length,
        0,
      ),
      color: "#3b82f6",
    },
  ].filter((s) => s.value > 0);

  const stats = [
    { label: "Total Scans", value: totalScans, icon: Search, color: "emerald" },
    { label: "Completed", value: completedScans, icon: Shield, color: "blue" },
    {
      label: "Vulnerabilities",
      value: totalVulns,
      icon: FileText,
      color: "yellow",
    },
    {
      label: "Critical",
      value: criticalVulns,
      icon: AlertTriangle,
      color: "red",
    },
  ];

  const recentScans = [...scans].reverse().slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {session.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-zinc-500 mt-1">Here's your security overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-500 text-sm">{stat.label}</span>
                <div className="bg-white/[0.04] rounded-lg p-1.5">
                  <Icon className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <DashboardCharts last7Days={last7Days} severityData={severityData} />

      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 mt-6">
        <h2 className="text-white font-semibold mb-4">Recent Scans</h2>
        {recentScans.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No scans yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Start your first scan to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <Link
                key={scan.id}
                href={`/dashboard/reports/${scan.id}`}
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] hover:border-emerald-500/20 rounded-xl transition-all"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {scan.targetUrl}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {new Date(scan.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {scan.report && (
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                        scan.report.score >= 70
                          ? "bg-emerald-500/10 text-emerald-400"
                          : scan.report.score >= 40
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {scan.report.score}/100
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      scan.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : scan.status === "RUNNING"
                          ? "bg-blue-500/10 text-blue-400"
                          : scan.status === "FAILED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {scan.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
