import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Shield, Search, FileText, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    include: { vulnerabilities: true },
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {session.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-zinc-500 mt-1">Here's your security overview</p>
      </div>

      {/* Stats */}
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

      {/* Recent scans */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Recent Scans</h2>
        {scans.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No scans yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Start your first scan to see results here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.slice(0, 5).map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {scan.targetUrl}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </p>
                </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
