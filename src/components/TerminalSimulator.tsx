"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalLine {
  type:
    | "command"
    | "output"
    | "success"
    | "error"
    | "info"
    | "ai"
    | "code"
    | "progress";
  content: string;
  delay?: number;
}

const scenarios: TerminalLine[][] = [
  // Scenario 1 — XSS + SQL Detection
  [
    { type: "command", content: "vulnscope scan https://target.com", delay: 0 },
    {
      type: "info",
      content: "Initializing VulnScope Engine v2.0...",
      delay: 800,
    },
    { type: "info", content: "Loading 28 detection rules...", delay: 400 },
    { type: "progress", content: "15", delay: 300 },
    { type: "progress", content: "35", delay: 300 },
    { type: "progress", content: "58", delay: 300 },
    { type: "progress", content: "79", delay: 300 },
    { type: "progress", content: "100", delay: 300 },
    { type: "success", content: "✓ Security headers checked", delay: 200 },
    {
      type: "success",
      content: "✓ SSL/TLS configuration verified",
      delay: 200,
    },
    {
      type: "error",
      content: "✗ Missing Content-Security-Policy [HIGH]",
      delay: 200,
    },
    {
      type: "error",
      content: "✗ SQL Injection detected in ?id= [CRITICAL]",
      delay: 200,
    },
    {
      type: "error",
      content: "✗ Reflected XSS in ?search= [HIGH]",
      delay: 200,
    },
    { type: "success", content: "✓ CORS policy validated", delay: 200 },
    { type: "info", content: "─────────────────────────────────", delay: 100 },
    { type: "ai", content: "🤖 AI > Explain the SQL Injection", delay: 600 },
    {
      type: "output",
      content: "The ?id= parameter is directly concatenated",
      delay: 400,
    },
    {
      type: "output",
      content: "into SQL queries without sanitization,",
      delay: 200,
    },
    {
      type: "output",
      content: "allowing attackers to extract all user data.",
      delay: 200,
    },
    { type: "ai", content: "🤖 AI > Generate secure patch", delay: 600 },
    { type: "code", content: "const query = db.prepare(", delay: 300 },
    {
      type: "code",
      content: '  "SELECT * FROM users WHERE id = ?"',
      delay: 200,
    },
    { type: "code", content: ");", delay: 100 },
    { type: "success", content: "✓ Patch generated", delay: 400 },
    { type: "info", content: "Generating PDF report...", delay: 500 },
    { type: "success", content: "✔ vulnscope-report.pdf saved", delay: 400 },
  ],
  // Scenario 2 — CORS + Headers
  [
    {
      type: "command",
      content: "vulnscope scan https://api.example.com",
      delay: 0,
    },
    {
      type: "info",
      content: "Initializing VulnScope Engine v2.0...",
      delay: 800,
    },
    { type: "info", content: "Loading 28 detection rules...", delay: 400 },
    { type: "progress", content: "25", delay: 300 },
    { type: "progress", content: "50", delay: 300 },
    { type: "progress", content: "75", delay: 300 },
    { type: "progress", content: "100", delay: 300 },
    {
      type: "error",
      content: "✗ Wildcard CORS Policy detected [MEDIUM]",
      delay: 200,
    },
    { type: "error", content: "✗ Missing HSTS Header [HIGH]", delay: 200 },
    {
      type: "error",
      content: "✗ X-Powered-By discloses PHP/8.1 [LOW]",
      delay: 200,
    },
    { type: "success", content: "✓ No SQL injection found", delay: 200 },
    { type: "success", content: "✓ No XSS vulnerabilities found", delay: 200 },
    { type: "info", content: "─────────────────────────────────", delay: 100 },
    {
      type: "ai",
      content: "🤖 AI > What is the risk of wildcard CORS?",
      delay: 600,
    },
    {
      type: "output",
      content: "Wildcard CORS allows any website to make",
      delay: 400,
    },
    {
      type: "output",
      content: "authenticated requests to your API, enabling",
      delay: 200,
    },
    { type: "output", content: "cross-origin data theft attacks.", delay: 200 },
    { type: "ai", content: "🤖 AI > Fix CORS for Next.js", delay: 600 },
    { type: "code", content: "// next.config.js", delay: 200 },
    { type: "code", content: "headers: [{ key: 'Access-Control-", delay: 200 },
    {
      type: "code",
      content: "Allow-Origin', value: 'https://app.com' }]",
      delay: 200,
    },
    { type: "success", content: "✓ Fix applied", delay: 400 },
    {
      type: "success",
      content: "✔ Security score improved: 45 → 78",
      delay: 400,
    },
  ],
];

function ProgressBar({ value }: { value: number }) {
  const filled = Math.floor((value / 100) * 20);
  const empty = 20 - filled;
  return (
    <span className="font-mono">
      <span className="text-emerald-400">{"█".repeat(filled)}</span>
      <span className="text-zinc-700">{"░".repeat(empty)}</span>
      <span className="text-zinc-400"> {value}%</span>
    </span>
  );
}

export default function TerminalSimulator() {
  const [visibleLines, setVisibleLines] = useState<
    (TerminalLine & { id: number; typed: string })[]
  >([]);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function runScenario(scenarioIndex: number) {
      setVisibleLines([]);
      setIsTyping(true);
      const lines = scenarios[scenarioIndex];

      for (const line of lines) {
        if (cancelled) return;

        await new Promise((r) => setTimeout(r, line.delay ?? 200));
        if (cancelled) return;

        const id = lineIdRef.current++;

        if (
          line.type === "command" ||
          line.type === "code" ||
          line.type === "ai"
        ) {
          // Type character by character
          setVisibleLines((prev) => [...prev, { ...line, id, typed: "" }]);
          for (let i = 0; i <= line.content.length; i++) {
            if (cancelled) return;
            await new Promise((r) => setTimeout(r, 28));
            setVisibleLines((prev) =>
              prev.map((l) =>
                l.id === id ? { ...l, typed: line.content.slice(0, i) } : l,
              ),
            );
          }
        } else {
          setVisibleLines((prev) => [
            ...prev,
            { ...line, id, typed: line.content },
          ]);
        }

        // Auto scroll
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }

      setIsTyping(false);

      // Wait then loop to next scenario
      await new Promise((r) => setTimeout(r, 3000));
      if (!cancelled) {
        setCurrentScenario((prev) => (prev + 1) % scenarios.length);
      }
    }

    runScenario(currentScenario);

    return () => {
      cancelled = true;
    };
  }, [currentScenario]);

  function renderLine(line: TerminalLine & { id: number; typed: string }) {
    switch (line.type) {
      case "command":
        return (
          <div key={line.id} className="flex items-start gap-2">
            <span className="text-emerald-400 shrink-0">$</span>
            <span className="text-white">{line.typed}</span>
            {line.typed.length < line.content.length && (
              <span className="animate-pulse text-emerald-400">▋</span>
            )}
          </div>
        );
      case "progress":
        return (
          <div key={line.id} className="flex items-center gap-2">
            <ProgressBar value={parseInt(line.typed)} />
          </div>
        );
      case "success":
        return (
          <div key={line.id} className="text-emerald-400">
            {line.typed}
          </div>
        );
      case "error":
        return (
          <div key={line.id} className="text-red-400">
            {line.typed}
          </div>
        );
      case "info":
        return (
          <div key={line.id} className="text-zinc-400">
            {line.typed}
          </div>
        );
      case "ai":
        return (
          <div key={line.id} className="flex items-start gap-2 mt-2">
            <span className="text-purple-400 shrink-0">&gt;</span>
            <span className="text-purple-300">{line.typed}</span>
            {line.typed.length < line.content.length && (
              <span className="animate-pulse text-purple-400">▋</span>
            )}
          </div>
        );
      case "output":
        return (
          <div key={line.id} className="text-zinc-300 pl-4">
            {line.typed}
          </div>
        );
      case "code":
        return (
          <div key={line.id} className="text-yellow-300 pl-4 font-mono">
            {line.typed}
            {line.typed.length < line.content.length && (
              <span className="animate-pulse text-yellow-400">▋</span>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-3xl mx-auto mt-16"
    >
      <div className="bg-[#0d0d14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111118] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-zinc-500 text-xs font-mono">
            vulnscope — terminal
          </span>
          <div className="w-16" />
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="p-5 font-mono text-sm space-y-1 h-80 overflow-y-auto scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          <AnimatePresence>
            {visibleLines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderLine(line)}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && visibleLines.length === 0 && (
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="text-emerald-400">$</span>
              <span className="animate-pulse">▋</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] bg-[#111118] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="h-2.5 w-2.5 rounded-full bg-emerald-400"
              />
              <span className="text-xs text-zinc-400 font-mono">
                AI Security Engine Running
              </span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              OWASP Top 10 Coverage
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
