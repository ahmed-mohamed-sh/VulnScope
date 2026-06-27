"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertTriangle, CheckCircle, Clock, Globe } from "lucide-react";

const severityConfig = {
  CRITICAL: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  HIGH: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  MEDIUM: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  LOW: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  INFO: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
};

export default function ReportClient({ initialScan }: { initialScan: any }) {
  const router = useRouter();
  const [scan, setScan] = useState(initialScan);

  useEffect(() => {
    if (scan.status === "COMPLETED" || scan.status === "FAILED") return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/scan/${scan.id}/status`);
      const data = await res.json();
      setScan(data);
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [scan.status]);

  const criticalCount = scan.vulnerabilities.filter(
    (v: any) => v.severity === "CRITICAL",
  ).length;
  const highCount = scan.vulnerabilities.filter(
    (v: any) => v.severity === "HIGH",
  ).length;
  const mediumCount = scan.vulnerabilities.filter(
    (v: any) => v.severity === "MEDIUM",
  ).length;
  const lowCount = scan.vulnerabilities.filter(
    (v: any) => v.severity === "LOW",
  ).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scan Report</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Globe className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-500 text-sm">{scan.targetUrl}</span>
            </div>
            {/* Download PDF button */}
            <a
              href={`/api/scan/${scan.id}/pdf`}
              target="_blank"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all mt-4 w-fit"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF Report
            </a>
          </div>
        </div>
      </div>

      {/* Running state */}
      {scan.status === "RUNNING" && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6 flex items-center gap-4">
          <Clock className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Scan in progress...</p>
            <p className="text-zinc-500 text-sm mt-0.5">
              Checking for vulnerabilities, this may take a moment
            </p>
          </div>
        </div>
      )}

      {/* Status + Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Status</p>
          <div
            className={`flex items-center gap-1.5 ${
              scan.status === "COMPLETED"
                ? "text-emerald-400"
                : scan.status === "RUNNING"
                  ? "text-blue-400"
                  : scan.status === "FAILED"
                    ? "text-red-400"
                    : "text-zinc-400"
            }`}
          >
            {scan.status === "COMPLETED" ? (
              <CheckCircle className="w-4 h-4" />
            ) : scan.status === "RUNNING" ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{scan.status}</span>
          </div>
        </div>

        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Total Issues</p>
          <p className="text-white font-bold text-xl">
            {scan.vulnerabilities.length}
          </p>
        </div>

        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Scanned</p>
          <p className="text-white text-sm font-medium">
            {new Date(scan.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-1">Critical</p>
          <p className="text-red-400 font-bold text-xl">{criticalCount}</p>
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Severity Breakdown</h2>
        <div className="flex gap-3 flex-wrap">
          {[
            {
              label: "Critical",
              count: criticalCount,
              color: "text-red-400",
              bg: "bg-red-500/10",
            },
            {
              label: "High",
              count: highCount,
              color: "text-orange-400",
              bg: "bg-orange-500/10",
            },
            {
              label: "Medium",
              count: mediumCount,
              color: "text-yellow-400",
              bg: "bg-yellow-500/10",
            },
            {
              label: "Low",
              count: lowCount,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.bg} rounded-xl px-4 py-2 flex items-center gap-2`}
            >
              <span className={`${s.color} font-bold text-lg`}>{s.count}</span>
              <span className="text-zinc-400 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vulnerabilities */}
      <div className="space-y-4">
        <h2 className="text-white font-semibold">Vulnerabilities Found</h2>
        {scan.vulnerabilities.length === 0 ? (
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-12 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium">No vulnerabilities found</p>
            <p className="text-zinc-500 text-sm mt-1">
              This target looks clean!
            </p>
          </div>
        ) : (
          scan.vulnerabilities.map((vuln: any) => {
            const config =
              severityConfig[vuln.severity as keyof typeof severityConfig];
            return (
              <div
                key={vuln.id}
                className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-white font-medium">{vuln.title}</h3>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border ${config.color} ${config.bg} ${config.border}`}
                  >
                    {vuln.severity}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm mb-4">{vuln.description}</p>
                <div className="space-y-3">
                  {vuln.evidence && (
                    <div className="bg-black/30 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">
                        Evidence
                      </p>
                      <p className="text-zinc-300 text-sm font-mono">
                        {vuln.evidence}
                      </p>
                    </div>
                  )}
                  {vuln.fix && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                      <p className="text-xs text-emerald-400 mb-1 uppercase tracking-wider">
                        Recommendation
                      </p>
                      <p className="text-zinc-300 text-sm">{vuln.fix}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <span className="text-xs px-2 py-0.5 bg-white/[0.04] text-zinc-500 rounded-md">
                    {vuln.category}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
