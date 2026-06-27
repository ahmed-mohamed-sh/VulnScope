"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [nameStatus, setNameStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [passwordStatus, setPasswordStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setNameLoading(true);
    setNameStatus("idle");
    setNameError("");

    const res = await fetch("/api/settings/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setNameError(data.error || "Something went wrong");
      setNameStatus("error");
    } else {
      await update({ name });
      setNameStatus("success");
      // Force full session refresh
      window.location.reload();
    }
    setNameLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordStatus("idle");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      setPasswordStatus("error");
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordStatus("error");
      setPasswordLoading(false);
      return;
    }

    const res = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      setPasswordError(data.error || "Something went wrong");
      setPasswordStatus("error");
    } else {
      setPasswordStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const res = await fetch("/api/settings/delete", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    }
    setDeleteLoading(false);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-500 mt-1">Manage your account preferences</p>
        </div>

        {/* Profile */}
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-white font-semibold">Profile</h2>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                title="Display Name"
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={session?.user?.email ?? ""}
                disabled
                title="valid email"
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
              />
              <p className="text-zinc-600 text-xs">Email cannot be changed</p>
            </div>

            {nameStatus === "error" && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{nameError}</p>
              </div>
            )}

            {nameStatus === "success" && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-emerald-400 text-sm">
                  Name updated successfully!
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={nameLoading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              {nameLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-white font-semibold">Change Password</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#13131f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {passwordStatus === "error" && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{passwordError}</p>
              </div>
            )}

            {passwordStatus === "success" && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-emerald-400 text-sm">
                  Password updated successfully!
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Update Password
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#0d0d14] border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-white font-semibold">Danger Zone</h2>
          </div>

          <p className="text-zinc-400 text-sm mb-4">
            Once you delete your account, all your scans and reports will be
            permanently deleted. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-400 text-sm font-medium">
                Are you sure? This cannot be undone!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2.5 rounded-xl border border-white/[0.06] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
