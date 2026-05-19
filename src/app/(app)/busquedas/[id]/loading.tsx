export default function Loading() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: "60vh",
      flexDirection: "column", gap: 16,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid #e2e8d9",
        borderTopColor: "var(--gl-olive, #2a4a18)",
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ fontSize: 13, color: "#8b9e73", fontWeight: 500 }}>
        Cargando búsqueda…
      </span>
    </div>
  )
}
