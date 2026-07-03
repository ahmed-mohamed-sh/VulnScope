"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Zap,
  FileText,
  Search,
  ChevronRight,
  Lock,
} from "lucide-react";
import TerminalSimulator from "@/components/TerminalSimulator";
// import Animated from "../../Animated";

const features = [
  {
    icon: Search,
    title: "Automated Scanning",
    description:
      "Scan any web target for OWASP Top 10 vulnerabilities automatically in seconds.",
  },
  {
    icon: Zap,
    title: "AI-Powered Analysis",
    description:
      "Groq AI analyzes results and generates professional security insights instantly.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description:
      "Download professional penetration test reports ready to send to clients.",
  },
  {
    icon: Lock,
    title: "Security First",
    description:
      "Built with ethical scanning in mind — only scan targets you own or have permission to test.",
  },
];

const scans = [
  {
    target: "https://target.com",
    lines: [
      { type: "success", text: "Scanning https://target.com" },
      { type: "success", text: "Crawling application..." },
      { type: "success", text: "Found 24 endpoints" },
      { type: "success", text: "Testing XSS..." },
      {
        type: "error",
        text: "Reflected XSS detected",
        badge: "HIGH",
      },
      { type: "success", text: "Testing SQL Injection..." },
      {
        type: "error",
        text: "SQL Injection detected",
        badge: "CRITICAL",
      },
      { type: "success", text: "Generating AI recommendations..." },
      {
        type: "ai",
        text: "AI generated secure code patches",
        badge: "35/100",
      },
    ],
  },
  {
    target: "https://shop.demo",
    lines: [
      { type: "success", text: "Scanning https://shop.demo" },
      { type: "success", text: "Checking Security Headers..." },
      {
        type: "error",
        text: "Missing Content-Security-Policy",
        badge: "HIGH",
      },
      {
        type: "warning",
        text: "CORS Misconfiguration",
        badge: "MEDIUM",
      },
      { type: "success", text: "Testing SSRF..." },
      { type: "success", text: "No SSRF detected" },
      { type: "success", text: "AI explaining findings..." },
      {
        type: "ai",
        text: "Risk Score Calculated",
        badge: "68/100",
      },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
            <div className="relative bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-1.5">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            VulnScope
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-8 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">
              AI-Powered Security Scanner
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl mb-6">
            Find Vulnerabilities
            <span className="text-emerald-400"> Before</span>
            <br />
            Hackers Do
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            VulnScope automatically scans your web applications for security
            vulnerabilities and generates professional penetration test reports
            powered by AI.
          </p>

          <div className="flex items-center gap-4 justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition-all"
            >
              Start Scanning Free
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Already have an account →
            </Link>
          </div>
        </motion.div>

        <TerminalSimulator />
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 py-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Everything you need to{" "}
            <span className="text-emerald-400">stay secure</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                  className="bg-[#0d0d14] border border-white/[0.06] hover:border-emerald-500/20 rounded-2xl p-6 transition-all"
                >
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 w-fit mb-4">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-8 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-[#0d0d14] border border-emerald-500/20 rounded-2xl p-12 max-w-2xl mx-auto"
        >
          <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to secure your app?
          </h2>
          <p className="text-zinc-400 mb-8">
            Join VulnScope and start finding vulnerabilities before attackers
            do.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 rounded-xl transition-all"
          >
            Get Started Free
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] px-8 py-6 text-center">
        <p className="text-zinc-600 text-sm">
          © 2026 VulnScope • AI-Powered Penetration Testing Platform
        </p>
      </footer>
    </div>
  );
}
