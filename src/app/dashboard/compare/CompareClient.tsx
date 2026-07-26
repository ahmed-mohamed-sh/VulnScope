"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompare,
  CheckCircle,
  AlertTriangle,
  Minus,
  TrendingUp,
  TrendingDown,
  Shield,
  Globe,
  Calendar,
} from "lucide-react";

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  category: string;
}

interface Scan {
  id: string;
  targetUrl: string;
  createdAt: string;
  vulnerabilities: Vulnerability[];
  report: { score: number } | null;
}

interface ComparisonResult {
  fixed: Vulnerability[];
  newVulns: Vulnerability[];
  persistent: Vulnerability[];
  scoreChange: number;
  scan1Score: number;
  scan2Score: number;
}

const severityOrder: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

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
  LOW: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

function VulnCard({
  vuln,
  type,
}: {
  vuln: Vulnerability;
  type: "fixed" | "new" | "persistent";
}) {
  const config = severityConfig[vuln.severity] ?? severityConfig.LOW;
  const typeConfig = {
    fixed: {
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
      label: "Fixed",
    },
    new: {
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/5",
      border: "border-red-500/20",
      label: "New",
    },
    persistent: {
      icon: Minus,
      color: "text-zinc-400",
      bg: "bg-white/[0.02]",
      border: "border-white/[0.06]",
      label: "Persistent",
    },
  }[type];

  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: type === "fixed" ? -10 : type === "new" ? 10 : 0,
      }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${typeConfig.bg} ${typeConfig.border}`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${typeConfig.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{vuln.title}</p>
        <p className="text-zinc-500 text-xs">{vuln.category}</p>
      </div>
      <span
        className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${config.color} ${config.bg} ${config.border}`}
      >
        {vuln.severity}
      </span>
    </motion.div>
  );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="3"
          />
          <motion.path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${score}, 100` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{score}</span>
        </div>
      </div>
      <p className="text-zinc-500 text-xs">{label}</p>
    </div>
  );
}

export default function CompareClient({ scans }: { scans: Scan[] }) {
  const [scan1Id, setScan1Id] = useState("");
  const [scan2Id, setScan2Id] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);

  function compare() {
    if (!scan1Id || !scan2Id || scan1Id === scan2Id) return;

    const scan1 = scans.find((s) => s.id === scan1Id)!;
    const scan2 = scans.find((s) => s.id === scan2Id)!;

    const scan1Titles = new Set(scan1.vulnerabilities.map((v) => v.title));
    const scan2Titles = new Set(scan2.vulnerabilities.map((v) => v.title));

    const fixed = scan1.vulnerabilities.filter(
      (v) => !scan2Titles.has(v.title),
    );
    const newVulns = scan2.vulnerabilities.filter(
      (v) => !scan1Titles.has(v.title),
    );
    const persistent = scan1.vulnerabilities.filter((v) =>
      scan2Titles.has(v.title),
    );

    const scan1Score = scan1.report?.score ?? 0;
    const scan2Score = scan2.report?.score ?? 0;

    setResult({
      fixed,
      newVulns,
      persistent,
      scoreChange: scan2Score - scan1Score,
      scan1Score,
      scan2Score,
    });
  }

  const scan1 = scans.find((s) => s.id === scan1Id);
  const scan2 = scans.find((s) => s.id === scan2Id);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
            <GitCompare className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Scan Comparison</h1>
        </div>
        <p className="text-zinc-500">
          Compare two scans to track security improvements over time
        </p>
      </div>

      {/* Scan Selector */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Scan 1 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Baseline Scan (Earlier)
            </label>
            <select
              value={scan1Id}
              onChange={(e) => {
                setScan1Id(e.target.value);
                setResult(null);
              }}
              className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
            >
              <option value="">Select a scan...</option>
              {scans.map((scan) => (
                <option
                  key={scan.id}
                  value={scan.id}
                  disabled={scan.id === scan2Id}
                >
                  {scan.targetUrl} —{" "}
                  {new Date(scan.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  ({scan.vulnerabilities.length} vulns)
                </option>
              ))}
            </select>
          </div>

          {/* Scan 2 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Latest Scan (Recent)
            </label>
            <select
              value={scan2Id}
              onChange={(e) => {
                setScan2Id(e.target.value);
                setResult(null);
              }}
              disabled={!scan1Id}
              className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">
                {scan1Id ? "Select a scan..." : "Select baseline first..."}
              </option>
              {scans
                .filter(
                  (scan) =>
                    scan.targetUrl === scan1?.targetUrl && scan.id !== scan1Id,
                )
                .map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {new Date(scan.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    — {scan.vulnerabilities.length} vulns — Score:{" "}
                    {scan.report?.score ?? "N/A"}/100
                  </option>
                ))}
            </select>
            {scan1Id &&
              scans.filter(
                (s) => s.targetUrl === scan1?.targetUrl && s.id !== scan1Id,
              ).length === 0 && (
                <p className="text-zinc-600 text-xs">
                  No other scans found for {scan1?.targetUrl}. Scan this target
                  again to compare.
                </p>
              )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={compare}
          disabled={!scan1Id || !scan2Id || scan1Id === scan2Id}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <GitCompare className="w-4 h-4" />
          Compare Scans
        </motion.button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && scan1 && scan2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score comparison */}
            <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-6">
                Security Score Comparison
              </h2>
              <div className="flex items-center justify-center gap-8">
                <ScoreCircle score={result.scan1Score} label="Baseline" />

                <div className="text-center">
                  <div
                    className={`flex items-center gap-1 justify-center text-2xl font-bold ${
                      result.scoreChange > 0
                        ? "text-emerald-400"
                        : result.scoreChange < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                    }`}
                  >
                    {result.scoreChange > 0 ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : result.scoreChange < 0 ? (
                      <TrendingDown className="w-6 h-6" />
                    ) : (
                      <Minus className="w-6 h-6" />
                    )}
                    {result.scoreChange > 0 ? "+" : ""}
                    {result.scoreChange}
                  </div>
                  <p className="text-zinc-500 text-xs mt-1">
                    {result.scoreChange > 0
                      ? "Improved"
                      : result.scoreChange < 0
                        ? "Worsened"
                        : "No change"}
                  </p>
                </div>

                <ScoreCircle score={result.scan2Score} label="Latest" />
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {result.fixed.length}
                </p>
                <p className="text-zinc-400 text-sm mt-1">Fixed</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Vulnerabilities resolved
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-red-400">
                  {result.newVulns.length}
                </p>
                <p className="text-zinc-400 text-sm mt-1">New</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Vulnerabilities introduced
                </p>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-zinc-400">
                  {result.persistent.length}
                </p>
                <p className="text-zinc-400 text-sm mt-1">Persistent</p>
                <p className="text-zinc-600 text-xs mt-0.5">Still unresolved</p>
              </div>
            </div>

            {/* Scan info */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { scan: scan1, label: "Baseline Scan" },
                { scan: scan2, label: "Latest Scan" },
              ].map(({ scan, label }) => (
                <div
                  key={scan.id}
                  className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4"
                >
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-white text-sm font-medium truncate">
                      {scan.targetUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-zinc-500 text-xs">
                      {new Date(scan.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fixed vulnerabilities */}
            {result.fixed.length > 0 && (
              <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-white font-semibold">
                    Fixed ({result.fixed.length})
                  </h2>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Great progress!
                  </span>
                </div>
                <div className="space-y-2">
                  {result.fixed
                    .sort(
                      (a, b) =>
                        (severityOrder[a.severity] ?? 5) -
                        (severityOrder[b.severity] ?? 5),
                    )
                    .map((vuln) => (
                      <VulnCard key={vuln.id} vuln={vuln} type="fixed" />
                    ))}
                </div>
              </div>
            )}

            {/* New vulnerabilities */}
            {result.newVulns.length > 0 && (
              <div className="bg-[#0d0d14] border border-red-500/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h2 className="text-white font-semibold">
                    New Vulnerabilities ({result.newVulns.length})
                  </h2>
                  <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    Needs attention!
                  </span>
                </div>
                <div className="space-y-2">
                  {result.newVulns
                    .sort(
                      (a, b) =>
                        (severityOrder[a.severity] ?? 5) -
                        (severityOrder[b.severity] ?? 5),
                    )
                    .map((vuln) => (
                      <VulnCard key={vuln.id} vuln={vuln} type="new" />
                    ))}
                </div>
              </div>
            )}

            {/* Persistent vulnerabilities */}
            {result.persistent.length > 0 && (
              <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Minus className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-white font-semibold">
                    Persistent ({result.persistent.length})
                  </h2>
                  <span className="text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                    Still unresolved
                  </span>
                </div>
                <div className="space-y-2">
                  {result.persistent
                    .sort(
                      (a, b) =>
                        (severityOrder[a.severity] ?? 5) -
                        (severityOrder[b.severity] ?? 5),
                    )
                    .map((vuln) => (
                      <VulnCard key={vuln.id} vuln={vuln} type="persistent" />
                    ))}
                </div>
              </div>
            )}

            {/* All fixed message */}
            {result.fixed.length > 0 &&
              result.newVulns.length === 0 &&
              result.persistent.length === 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
                  <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-semibold text-lg">
                    All vulnerabilities fixed! 🎉
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    Great job — the target is significantly more secure than
                    before.
                  </p>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {scans.length < 2 && (
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-12 text-center">
          <GitCompare className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">
            You need at least 2 completed scans to compare
          </p>
          <p className="text-zinc-600 text-sm mt-1">
            Run more scans to unlock comparison
          </p>
        </div>
      )}
    </div>
  );
}
