"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Prediction {
  title: string;
  confidence: number;
  severity: string;
  category: string;
  reason: string;
}

interface PredictionResult {
  predictions: Prediction[];
  targetAnalysis: string;
  message?: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-blue-400",
  INFO: "text-zinc-400",
};

const confidenceColor = (confidence: number) => {
  if (confidence >= 80) return "bg-red-500";
  if (confidence >= 60) return "bg-orange-500";
  if (confidence >= 40) return "bg-yellow-500";
  return "bg-blue-500";
};

export default function VulnPrediction({ targetUrl }: { targetUrl: string }) {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function predict() {
    if (!targetUrl || loading) return;
    setLoading(true);
    setIsOpen(true);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        predictions: [],
        targetAnalysis: "Prediction failed.",
        message: "Error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0d0d14] border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={result ? () => setIsOpen(!isOpen) : predict}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">
              AI Vulnerability Prediction
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {result
                ? `${result.predictions.length} vulnerabilities predicted`
                : "Click to predict vulnerabilities before scanning"}
            </p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        ) : result ? (
          isOpen ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )
        ) : (
          <span className="text-xs text-purple-400 font-medium bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg">
            Predict
          </span>
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06]">
              {/* Target Analysis */}
              {result.targetAnalysis && (
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 mt-4">
                  <p className="text-xs text-purple-400 uppercase tracking-wider mb-1">
                    Target Analysis
                  </p>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {result.targetAnalysis}
                  </p>
                </div>
              )}

              {/* No data message */}
              {result.message && (
                <p className="text-zinc-500 text-sm text-center py-4">
                  {result.message}
                </p>
              )}

              {/* Predictions */}
              {result.predictions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider">
                    Predicted Vulnerabilities
                  </p>
                  {result.predictions.map((pred, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-white text-sm font-medium">
                            {pred.title}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {pred.reason}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-bold ${severityColors[pred.severity] ?? "text-zinc-400"}`}
                        >
                          {pred.severity}
                        </span>
                      </div>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${confidenceColor(pred.confidence)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pred.confidence}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                          />
                        </div>
                        <span className="text-zinc-500 text-xs shrink-0">
                          {pred.confidence}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={predict}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Re-run prediction →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
