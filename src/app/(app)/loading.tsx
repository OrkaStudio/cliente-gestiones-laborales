export default function Loading() {
  return (
    <div className="px-10 py-10 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-10">
        <div className="h-3 w-24 rounded-full mb-3" style={{ background: "var(--gl-border)" }} />
        <div className="h-9 w-64 rounded-xl" style={{ background: "var(--gl-border)" }} />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl border" style={{ background: "#fff", borderColor: "var(--gl-border)" }}>
            <div className="h-8 w-8 rounded-lg mb-3" style={{ background: "var(--gl-border)" }} />
            <div className="h-3 w-20 rounded-full mb-1.5" style={{ background: "var(--gl-border)" }} />
            <div className="h-2.5 w-14 rounded-full" style={{ background: "var(--gl-border)" }} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-6" style={{ background: "#fff", borderColor: "var(--gl-border)", minHeight: 240 }} />
        <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: "var(--gl-border)", minHeight: 240 }} />
      </div>
    </div>
  )
}
