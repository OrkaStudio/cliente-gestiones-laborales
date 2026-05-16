export default function Loading() {
  return (
    <div className="px-10 py-10 animate-pulse">
      <header className="mb-6">
        <div className="h-3 w-28 rounded-full mb-3" style={{ background: "var(--gl-border)" }} />
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-40 rounded-xl" style={{ background: "var(--gl-border)" }} />
          <div className="h-9 w-32 rounded-lg" style={{ background: "var(--gl-border)" }} />
        </div>
      </header>

      <div className="mb-6 h-10 w-80 rounded-lg" style={{ background: "var(--gl-border)" }} />

      <div
        style={{
          background: "#fff",
          border: "1px solid var(--gl-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          className="h-10"
          style={{ background: "var(--gl-surface)", borderBottom: "1px solid var(--gl-border)" }}
        />
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--gl-border)" }}
          >
            <div className="h-4 w-40 rounded-full" style={{ background: "var(--gl-border)" }} />
            <div className="h-3.5 w-28 rounded-full" style={{ background: "var(--gl-border)" }} />
            <div className="h-3.5 w-8 rounded-full" style={{ background: "var(--gl-border)" }} />
            <div className="h-3.5 w-24 rounded-full" style={{ background: "var(--gl-border)" }} />
            <div className="h-3.5 flex-1 rounded-full" style={{ background: "var(--gl-border)" }} />
          </div>
        ))}
      </div>
    </div>
  )
}
