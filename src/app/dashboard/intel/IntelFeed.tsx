"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Clock,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CVE {
  id: string;
  description: string;
  score: number;
  severity: string;
  published: string;
  modified: string;
  weaknesses: string[];
  affectedProducts: string[];
  url: string;
  isRelevant: boolean;
  relevantTargets: string[];
}

const severityConfig: Record<
  string,
  { color: string; bg: string; border: string; dot: string }
> = {
  RELEVANT: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  CRITICAL: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    dot: "bg-red-400",
  },
  HIGH: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
  },
  MEDIUM: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  LOW: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
};

export default function IntelFeed() {
  const [feed, setFeed] = useState<CVE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchFeed() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/intel");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeed(data.feed);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to fetch threat intelligence");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeed();
  }, []);

  const filtered =
    filter === "ALL"
      ? feed
      : filter === "RELEVANT"
        ? feed.filter((c) => c.isRelevant)
        : feed.filter((c) => c.severity === filter);

  const counts = {
    ALL: feed.length,
    RELEVANT: feed.filter((c) => c.isRelevant).length,
    CRITICAL: feed.filter((c) => c.severity === "CRITICAL").length,
    HIGH: feed.filter((c) => c.severity === "HIGH").length,
    MEDIUM: feed.filter((c) => c.severity === "MEDIUM").length,
    LOW: feed.filter((c) => c.severity === "LOW").length,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Threat Intelligence
            </h1>
          </div>
          <p className="text-zinc-500">
            Live CVE feed from NVD — {feed.length} vulnerabilities loaded
          </p>
          {lastUpdated && (
            <p className="text-zinc-600 text-xs mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </p>
          )}
        </div>

        <button
          onClick={fetchFeed}
          disabled={loading}
          className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {(
          ["ALL", "RELEVANT", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const
        ).map((sev) => {
          const config =
            sev === "ALL"
              ? {
                  color: "text-white",
                  bg: "bg-white/[0.04]",
                  border: "border-white/[0.08]",
                  dot: "bg-white",
                }
              : severityConfig[sev];
          return (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`p-3 rounded-xl border transition-all text-left ${
                filter === sev
                  ? `${config.bg} ${config.border}`
                  : "bg-[#0d0d14] border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <p
                className={`text-xl font-bold ${filter === sev ? config.color : "text-white"}`}
              >
                {counts[sev]}
              </p>
              <p className="text-zinc-500 text-xs">{sev}</p>
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-6 bg-white/[0.04] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.04] rounded w-full" />
                  <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((cve, i) => {
              const config = severityConfig[cve.severity] ?? severityConfig.LOW;
              return (
                <motion.div
                  key={cve.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-[#0d0d14] border rounded-2xl p-5 transition-all ${
                    cve.isRelevant
                      ? "border-red-500/20 hover:border-red-500/40"
                      : "border-white/[0.06] hover:border-emerald-500/20"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity badge */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${config.color} ${config.bg} ${config.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                        />
                        {cve.severity}
                      </span>
                      {cve.score > 0 && (
                        <p
                          className={`text-center text-lg font-bold mt-1 ${config.color}`}
                        >
                          {cve.score}
                        </p>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <a
                          href={cve.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          {cve.id}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <span className="text-zinc-600 text-xs shrink-0">
                          {formatDistanceToNow(new Date(cve.published), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                        {cve.description}
                      </p>

                      {/* Relevance warning */}
                      {cve.isRelevant && (
                        <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-400 text-xs font-medium">
                              May affect your scanned targets
                            </p>
                            {cve.relevantTargets.length > 0 && (
                              <p className="text-zinc-500 text-xs mt-0.5">
                                {cve.relevantTargets.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {cve.weaknesses.slice(0, 2).map((w, idx) => (
                          <span
                            key={`${w}-${idx}`}
                            className="text-xs px-2 py-0.5 bg-white/[0.04] text-zinc-500 border border-white/[0.04] rounded-md"
                          >
                            {w}
                          </span>
                        ))}
                        {cve.affectedProducts.slice(0, 2).map((p, idx) => (
                          <span
                            key={`${p}-${idx}`}
                            className="text-xs px-2 py-0.5 bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 rounded-md"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
