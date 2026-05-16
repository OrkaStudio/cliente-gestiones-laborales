export default function Loading() {
  return (
    <div className="px-10 py-10 animate-pulse">
      <header className="mb-8">
        <div className="h-3 w-20 rounded-full mb-3" style={{ background: "var(--gl-border)" }} />
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-36 rounded-xl" style={{ background: "var(--gl-border)" }} />
          <div className="h-9 w-36 rounded-lg" style={{ background: "var(--gl-border)" }} />
        </div>
      </header>

      <div className="mb-6 h-10 w-72 rounded-lg" style={{ background: "var(--gl-border)" }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border flex flex-col gap-4"
            style={{ background: "#fff", borderColor: "var(--gl-border)", minHeight: 180 }}
          >
            <div className="flex items-start gap-3.5">
              <div className="h-11 w-11 rounded-xl" style={{ background: "var(--gl-border)" }} />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-36 rounded-full" style={{ background: "var(--gl-border)" }} />
                <div className="h-3 w-24 rounded-full" style={{ background: "var(--gl-border)" }} />
              </div>
            </div>
            <div className="h-8 rounded-lg" style={{ background: "var(--gl-border)" }} />
            <div className="h-4 w-28 rounded-full mt-auto" style={{ background: "var(--gl-border)" }} />
          </div>
        ))}
      </div>
    </div>
  )
}
