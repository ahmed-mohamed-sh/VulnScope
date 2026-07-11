"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Shield,
  AlertCircle,
  Globe,
  ChevronRight,
  Lock,
} from "lucide-react";
import VulnPrediction from "@/components/VulnPrediction";

const scanTypes = [
  {
    id: "headers",
    label: "Security Headers",
    description: "Check HTTP security headers",
    icon: Shield,
  },
  {
    id: "xss",
    label: "XSS Detection",
    description: "Cross-site scripting vulnerabilities",
    icon: AlertCircle,
  },
  {
    id: "sqli",
    label: "SQL Injection",
    description: "Database injection attack vectors",
    icon: AlertCircle,
  },
  {
    id: "ssl",
    label: "SSL/TLS Analysis",
    description: "Certificate and protocol issues",
    icon: Lock,
  },
];

export default function NewScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must confirm you own this target.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/reports/${data.scanId}`);
    } catch {
      setError("Failed to start scan");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">New Scan</h1>
          <p className="text-zinc-500 mt-1">
            Enter a target URL to begin vulnerability scanning
          </p>
        </div>

        {/* Scan types */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {scanTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span className="text-white text-sm font-medium">
                    {type.label}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs">{type.description}</p>
              </div>
            );
          })}
        </div>

        {/* Form */}
        <form
          onSubmit={handleScan}
          className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 space-y-5"
        >
          {/* URL input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Target URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* AI Prediction */}
          {url && <VulnPrediction targetUrl={url} />}

          {/* Ownership checkbox */}
          <div
            onClick={() => setAgreed(!agreed)}
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              agreed
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <div
              className={`w-4 h-4 rounded shrink-0 mt-0.5 border flex items-center justify-center transition-all ${
                agreed ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"
              }`}
            >
              {agreed && <span className="text-white text-xs">✓</span>}
            </div>
            <p className="text-zinc-400 text-sm">
              I confirm that I own or have explicit permission to scan this
              target. Unauthorized scanning is illegal.
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Search className="w-4 h-4 animate-pulse" />
                Starting scan...
              </>
            ) : (
              <>
                Start Scan
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
