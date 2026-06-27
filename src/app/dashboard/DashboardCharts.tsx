"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Props {
  last7Days: { date: string; scans: number; vulns: number }[];
  severityData: { name: string; value: number; color: string }[];
}

export default function DashboardCharts({ last7Days, severityData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Area chart */}
      <div className="lg:col-span-2 bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-6">
          Scan Activity (Last 7 Days)
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={last7Days}>
            <defs>
              <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vulnGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="date" stroke="#52525b" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#52525b"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d0d14",
                border: "1px solid #ffffff10",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="scans"
              stroke="#10b981"
              fill="url(#scanGradient)"
              strokeWidth={2}
              name="Scans"
            />
            <Area
              type="monotone"
              dataKey="vulns"
              stroke="#ef4444"
              fill="url(#vulnGradient)"
              strokeWidth={2}
              name="Vulnerabilities"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-zinc-400 text-xs">Scans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-zinc-400 text-xs">Vulnerabilities</span>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-6">Severity Distribution</h2>
        {severityData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
            No data yet
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0d0d14",
                    border: "1px solid #ffffff10",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2 mt-2">
              {severityData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-zinc-400 text-xs">{s.name}</span>
                  </div>
                  <span className="text-white text-xs font-medium">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
