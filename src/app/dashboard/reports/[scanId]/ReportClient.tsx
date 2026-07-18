"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Globe } from "lucide-react";
import ChatPanel from "./ChatPanel";

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

function AttackChainCard({ chain }: { chain: any }) {
  let steps: string[] = [];
  let involvedVulns: string[] = [];

  try {
    steps =
      typeof chain.attackSteps === "string"
        ? JSON.parse(chain.attackSteps)
        : (chain.attackSteps ?? []);
  } catch {
    steps = [];
  }

  try {
    involvedVulns =
      typeof chain.involvedVulnerabilities === "string"
        ? JSON.parse(chain.involvedVulnerabilities)
        : (chain.involvedVulnerabilities ?? []);
  } catch {
    involvedVulns = [];
  }

  const severityConfig: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
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
  };

  const config = severityConfig[chain.severity] ?? severityConfig.HIGH;

  return (
    <div
      className={`bg-[#0d0d14] border ${config.border} rounded-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className={`${config.bg} px-6 py-4 border-b ${config.border}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`${config.bg} border ${config.border} rounded-lg p-1.5`}
            >
              <svg
                className={`w-4 h-4 ${config.color}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">{chain.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                CVSS Score: {chain.cvss}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border ${config.color} ${config.bg} ${config.border}`}
          >
            {chain.severity}
          </span>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* AI Narrative */}
        {chain.aiNarrative && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">
                AI Exploit Narrative
              </p>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {chain.aiNarrative}
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-zinc-400 text-sm leading-relaxed">
          {chain.description}
        </p>

        {/* Involved Vulnerabilities */}
        {involvedVulns.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
              Vulnerabilities Involved
            </p>
            <div className="flex flex-wrap gap-2">
              {involvedVulns.map((vuln: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 bg-white/[0.04] text-zinc-400 border border-white/[0.06] rounded-lg"
                >
                  {vuln}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attack Steps */}
        {steps.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
              Attack Chain Steps
            </p>
            <div className="space-y-2">
              {steps.map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-5 h-5 rounded-full ${config.bg} border ${config.border} flex items-center justify-center mt-0.5`}
                  >
                    <span className={`text-xs font-bold ${config.color}`}>
                      {i + 1}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remediation */}
        {chain.remediation && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">
              Remediation
            </p>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {chain.remediation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
export default function ReportClient({ initialScan }: { initialScan: any }) {
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

  const vulnerabilities = scan.vulnerabilities ?? [];
  const attackChains = scan.attackChains ?? [];
  const criticalCount = vulnerabilities.filter(
    (v: any) => v.severity === "CRITICAL",
  ).length;
  const highCount = vulnerabilities.filter(
    (v: any) => v.severity === "HIGH",
  ).length;
  const mediumCount = vulnerabilities.filter(
    (v: any) => v.severity === "MEDIUM",
  ).length;
  const lowCount = vulnerabilities.filter(
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

      {/* AI Analysis */}
      {scan.report && (
        <div className="bg-[#0d0d14] border border-emerald-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <h2 className="text-white font-semibold">AI Security Analysis</h2>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1e1e2e"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    scan.report.score >= 70
                      ? "#10b981"
                      : scan.report.score >= 40
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${scan.report.score}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {scan.report.score}
                </span>
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">
                Security Score
              </p>
              <p
                className={`text-lg font-bold ${
                  scan.report.score >= 70
                    ? "text-emerald-400"
                    : scan.report.score >= 40
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {scan.report.score >= 70
                  ? "Good"
                  : scan.report.score >= 40
                    ? "Needs Work"
                    : "Critical Risk"}
              </p>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Executive Summary
            </p>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {scan.report.summary}
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
            {vulnerabilities.length}
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

      {/* Attack Chains */}
      {attackChains.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold">
                Attack Chains Detected
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                {attackChains.length} dangerous vulnerability combination
                {attackChains.length > 1 ? "s" : ""} found
              </p>
            </div>
            <span className="ml-auto text-xs px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-medium">
              High Priority
            </span>
          </div>

          {attackChains.map((chain: any) => (
            <AttackChainCard key={chain.id} chain={chain} />
          ))}
        </div>
      )}

      {/* Vulnerabilities */}
      <div className="space-y-4">
        <h2 className="text-white font-semibold">Vulnerabilities Found</h2>
        {/* Verification Summary */}
        {vulnerabilities.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-4 bg-[#0d0d14] border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-zinc-400 text-sm">
                <span className="text-white font-medium">
                  {
                    vulnerabilities.filter((v: any) => v.confidence === "HIGH")
                      .length
                  }
                </span>{" "}
                Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span className="text-zinc-400 text-sm">
                <span className="text-white font-medium">
                  {
                    vulnerabilities.filter(
                      (v: any) => v.confidence === "MEDIUM",
                    ).length
                  }
                </span>{" "}
                Possible
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-zinc-500 rounded-full" />
              <span className="text-zinc-400 text-sm">
                <span className="text-white font-medium">
                  {
                    vulnerabilities.filter((v: any) => v.confidence === "LOW")
                      .length
                  }
                </span>{" "}
                Unverified
              </span>
            </div>
          </div>
        )}
        {vulnerabilities.length === 0 ? (
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-12 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-medium">No vulnerabilities found</p>
            <p className="text-zinc-500 text-sm mt-1">
              This target looks clean!
            </p>
          </div>
        ) : (
          vulnerabilities.map((vuln: any) => {
            const config =
              severityConfig[vuln.severity as keyof typeof severityConfig];
            return (
              <div
                key={vuln.id}
                className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-2">
                    <h3 className="text-white font-medium">{vuln.title}</h3>
                    {/* Verification badge */}
                    {vuln.confidence === "HIGH" && (
                      <span className="shrink-0 text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mt-0.5">
                        ✓ Verified
                      </span>
                    )}
                    {vuln.confidence === "LOW" && (
                      <span className="shrink-0 text-xs px-2 py-0.5 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full mt-0.5">
                        ? Unverified
                      </span>
                    )}
                    {vuln.confidence === "MEDIUM" && (
                      <span className="shrink-0 text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full mt-0.5">
                        ~ Possible
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium border ${config.color} ${config.bg} ${config.border}`}
                  >
                    {vuln.severity}
                  </span>
                </div>

                {/* Verification Note */}
                {vuln.verificationNote && (
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 mb-3">
                    <p className="text-zinc-400 text-xs">
                      {vuln.verificationNote}
                    </p>
                  </div>
                )}

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
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-white/[0.04] text-zinc-500 rounded-md">
                    {vuln.category}
                  </span>
                  {vuln.isFalsePositive && (
                    <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md">
                      False Positive
                    </span>
                  )}
                  {vuln.isConfirmed && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                      Confirmed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <ChatPanel scanId={scan.id} />
    </div>
  );
}
