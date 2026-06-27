"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Scan", href: "/dashboard/scan", icon: Search },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#050508] flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 72 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative flex flex-col bg-[#0d0d14] border-r border-white/[0.06] h-screen top-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-md" />
              <div className="relative bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-1.5">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-bold text-lg tracking-tight"
              >
                VulnScope
              </motion.span>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-zinc-500 hover:text-white transition-all shrink-0"
          >
            {sidebarOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium"
              >
                Sign Out
              </motion.span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
