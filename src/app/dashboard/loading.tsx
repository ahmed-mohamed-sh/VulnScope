export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-8 w-48 bg-white/[0.04] rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-32 bg-white/[0.04] rounded-xl animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-5"
          >
            <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-white/[0.04] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
          <div className="h-5 w-48 bg-white/[0.04] rounded animate-pulse mb-6" />
          <div className="h-48 bg-white/[0.04] rounded-xl animate-pulse" />
        </div>
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
          <div className="h-5 w-36 bg-white/[0.04] rounded animate-pulse mb-6" />
          <div className="h-48 bg-white/[0.04] rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Recent scans skeleton */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-6">
        <div className="h-5 w-32 bg-white/[0.04] rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl"
            >
              <div>
                <div className="h-4 w-48 bg-white/[0.04] rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-white/[0.04] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
