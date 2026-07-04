"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Zap,
  FileText,
  Search,
  ChevronRight,
  Lock,
  AlertTriangle,
  CheckCircle,
  Globe,
  Code,
  Eye,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import TerminalSimulator from "@/components/TerminalSimulator";

// ── Animated Counter ──
function AnimatedCounter({
  target,
  duration = 2000,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const timer = setInterval(() => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress === 1) clearInterval(timer);
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// ── Matrix Rain Background ──
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const chars =
      "01アイウエオ</>{}[]();=+*#@!%^&SQLXSSCSPcurl:/{}/root/etc/passwd";
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns)
      .fill(0)
      .map(() => Math.random() * -100);
    const speeds: number[] = Array(columns)
      .fill(0)
      .map(() => 0.3 + Math.random() * 0.7);
    const opacities: number[] = Array(columns)
      .fill(0)
      .map(() => 0.05 + Math.random() * 0.2);

    const draw = () => {
      ctx.fillStyle = "rgba(5, 5, 8, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = `rgba(16, 185, 129, ${opacities[i] * 3})`;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(char, x, y);

        ctx.fillStyle = `rgba(16, 185, 129, ${opacities[i]})`;
        ctx.font = `${fontSize}px monospace`;
        for (let j = 1; j < 8; j++) {
          const bodyChar = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(bodyChar, x, y - j * fontSize);
        }

        if (Math.random() > 0.995) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
          ctx.fillText(char, x, y);
        }

        if (y > canvas.height && Math.random() > 0.98) drops[i] = 0;
        drops[i] += speeds[i];
      }
    };

    const interval = setInterval(draw, 40);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}

// ── Radar Scan Animation ──
function RadarScan() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
      <div className="absolute inset-4 rounded-full border border-emerald-500/15" />
      <div className="absolute inset-8 rounded-full border border-emerald-500/10" />
      <div className="absolute inset-12 rounded-full border border-emerald-500/10" />

      {/* Radar sweep */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(16,185,129,0.15) 60deg, transparent 60deg)",
        }}
      />

      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
      </div>

      {/* Blip dots */}
      {[
        { top: "20%", left: "65%", delay: 0 },
        { top: "60%", left: "25%", delay: 0.8 },
        { top: "35%", left: "40%", delay: 1.5 },
        { top: "70%", left: "70%", delay: 2.1 },
      ].map((blip, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-red-400 rounded-full"
          style={{ top: blip.top, left: blip.left }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: blip.delay,
            repeatDelay: 1.5,
          }}
        />
      ))}
    </div>
  );
}

// ── OWASP Grid ──
const owaspItems = [
  { id: "A01", name: "Broken Access Control", covered: true },
  { id: "A02", name: "Cryptographic Failures", covered: true },
  { id: "A03", name: "Injection", covered: true },
  { id: "A04", name: "Insecure Design", covered: false },
  { id: "A05", name: "Security Misconfiguration", covered: true },
  { id: "A06", name: "Vulnerable Components", covered: false },
  { id: "A07", name: "Auth Failures", covered: true },
  { id: "A08", name: "Data Integrity Failures", covered: true },
  { id: "A09", name: "Logging Failures", covered: false },
  { id: "A10", name: "SSRF", covered: true },
];

// ── Floating Vulnerability Cards ──
const floatingVulns = [
  {
    title: "SQL Injection",
    severity: "CRITICAL",
    color: "red",
    x: -180,
    y: -60,
  },
  { title: "XSS Detected", severity: "HIGH", color: "orange", x: 180, y: -40 },
  { title: "Missing CSP", severity: "HIGH", color: "orange", x: -160, y: 80 },
  {
    title: "CORS Wildcard",
    severity: "MEDIUM",
    color: "yellow",
    x: 170,
    y: 90,
  },
];

const features = [
  {
    icon: Search,
    title: "Automated Scanning",
    description:
      "Scan any web target for OWASP Top 10 vulnerabilities automatically in seconds using our rule-based engine.",
  },
  {
    icon: Zap,
    title: "AI-Powered Analysis",
    description:
      "Groq AI analyzes results and generates professional security insights with executive summaries instantly.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description:
      "Download professional penetration test reports ready to send to clients or add to your portfolio.",
  },
  {
    icon: Lock,
    title: "28+ Detection Rules",
    description:
      "Rule-based detection engine inspired by Nuclei with YAML-defined checks across all vulnerability categories.",
  },
  {
    icon: Code,
    title: "Attack Chain Detection",
    description:
      "AI correlates multiple vulnerabilities to find dangerous exploit chains that individual checks miss.",
  },
  {
    icon: Eye,
    title: "Continuous Monitoring",
    description:
      "Schedule recurring scans to detect new vulnerabilities before attackers do.",
  },
];

export default function LandingPage() {
  const [vulnCount, setVulnCount] = useState(1247832);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVulnCount((prev) => prev + Math.floor(Math.random() * 5 + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen  text-white overflow-hidden"
      style={{ background: "#050508" }}
    >
      {/* Global ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
    radial-gradient(ellipse 80% 40% at 50% 0%, rgba(16,185,129,0.1) 0%, transparent 60%),
    radial-gradient(ellipse 60% 30% at 20% 50%, rgba(16,185,129,0.04) 0%, transparent 50%),
    radial-gradient(ellipse 60% 30% at 80% 50%, rgba(16,185,129,0.04) 0%, transparent 50%)
  `,
        }}
      />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06] backdrop-blur-sm bg-[#050508]">
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

      {/* Live counter banner */}
      <div className="relative z-10 bg-emerald-500/5 border-b border-emerald-500/10 py-2.5 px-8 bg-[#050508]">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 bg-red-400 rounded-full"
          />
          <span className="text-zinc-400 text-sm font-mono">
            🔴{" "}
            <span className="text-white font-bold">
              {vulnCount.toLocaleString()}
            </span>{" "}
            vulnerabilities detected globally today
          </span>
        </div>
      </div>

      {/* Hero — Matrix Rain only here */}
      <section className="relative z-10 overflow-hidden flex flex-col items-center text-center px-8 pt-20 pb-16 bg-[#050508]">
        <MatrixRain />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

        <motion.div
          className="relative z-10"
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

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight max-w-4xl mb-6">
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

          <div className="flex items-center gap-4 justify-center mb-6">
            <Link
              href="/register"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
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

          <div className="flex items-center justify-center gap-8 text-center">
            {[
              { value: 50000, label: "Scans Performed", suffix: "+" },
              { value: 28, label: "Detection Rules", suffix: "+" },
              { value: 99, label: "Accuracy Rate", suffix: "%" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">
                  <AnimatedCounter target={stat.value} />
                  {stat.suffix}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 w-full">
          <TerminalSimulator />
        </div>
      </section>

      {/* Radar section */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Real-time Threat{" "}
              <span className="text-emerald-400">Detection</span>
            </h2>
            <p className="text-zinc-500 max-w-lg mx-auto">
              Our engine continuously scans for vulnerabilities across all OWASP
              Top 10 categories simultaneously.
            </p>
          </motion.div>

          <div className="flex items-center justify-center relative">
            <RadarScan />
            {floatingVulns.map((vuln, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ x: vuln.x, y: vuln.y }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                animate={{ y: [vuln.y, vuln.y - 8, vuln.y] }}
              >
                <div
                  className={`bg-[#0d0d14] border rounded-xl px-3 py-2 text-xs whitespace-nowrap ${
                    vuln.color === "red"
                      ? "border-red-500/30"
                      : vuln.color === "orange"
                        ? "border-orange-500/30"
                        : "border-yellow-500/30"
                  }`}
                >
                  <p className="text-white font-medium">{vuln.title}</p>
                  <p
                    className={`text-xs ${
                      vuln.color === "red"
                        ? "text-red-400"
                        : vuln.color === "orange"
                          ? "text-orange-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {vuln.severity}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OWASP Coverage */}
      <section
        className="relative z-10 py-24 px-8"
        style={{
          background: "linear-gradient(to bottom, #050508, #0a0f0a, #050508)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              OWASP Top 10 <span className="text-emerald-400">Coverage</span>
            </h2>
            <p className="text-zinc-500 max-w-lg mx-auto">
              VulnScope covers the most critical web application security risks
              defined by OWASP.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {owaspItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  item.covered
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-white/[0.02] border-white/[0.06]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.covered ? "bg-emerald-500/20" : "bg-zinc-800"
                  }`}
                >
                  {item.covered ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
                <div>
                  <span
                    className={`text-xs font-mono ${item.covered ? "text-emerald-400" : "text-zinc-600"}`}
                  >
                    {item.id}
                  </span>
                  <p
                    className={`text-sm font-medium ${item.covered ? "text-white" : "text-zinc-600"}`}
                  >
                    {item.name}
                  </p>
                </div>
                {item.covered && (
                  <span className="ml-auto text-xs text-emerald-400 font-medium">
                    Covered
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After */}
      <section className="relative z-10 py-24 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              See the <span className="text-emerald-400">Difference</span>
            </h2>
            <p className="text-zinc-500 max-w-lg mx-auto">
              VulnScope helps you identify and fix vulnerabilities, dramatically
              improving your security posture.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#0d0d14] border border-red-500/20 rounded-2xl p-6"
            >
              <p className="text-red-400 text-xs font-medium uppercase tracking-wider mb-4">
                Before VulnScope
              </p>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
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
                      stroke="#ef4444"
                      strokeWidth="3"
                      initial={{ strokeDasharray: "0, 100" }}
                      whileInView={{ strokeDasharray: "23, 100" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-400 font-bold text-lg">23</span>
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold text-2xl">23/100</p>
                  <p className="text-red-400 text-sm">Critical Risk</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "7 Critical vulnerabilities",
                  "SQL Injection exposed",
                  "No HTTPS configured",
                  "Missing security headers",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-zinc-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#0d0d14] border border-emerald-500/20 rounded-2xl p-6"
            >
              <p className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-4">
                After VulnScope
              </p>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
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
                      stroke="#10b981"
                      strokeWidth="3"
                      initial={{ strokeDasharray: "0, 100" }}
                      whileInView={{ strokeDasharray: "87, 100" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-lg">
                      87
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold text-2xl">87/100</p>
                  <p className="text-emerald-400 text-sm">Secure</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "All critical issues fixed",
                  "SQL Injection patched",
                  "HTTPS enforced",
                  "Security headers added",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-zinc-400 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="relative z-10 px-8 py-24"
        style={{
          background: "linear-gradient(to bottom, #050508, #0a0f0a, #050508)",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need to{" "}
              <span className="text-emerald-400">stay secure</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
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
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-8 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#0d0d14] border border-emerald-500/20 rounded-2xl p-12 max-w-2xl mx-auto relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl" />
          <div className="relative z-10">
            <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to secure your app?
            </h2>
            <p className="text-zinc-400 mb-8">
              Join VulnScope and start finding vulnerabilities before attackers
              do. Free to get started.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-8 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Get Started Free
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
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
