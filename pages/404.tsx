export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", gap: "1rem" }}>
      <div>
        <p style={{ letterSpacing: "0.3em", textTransform: "uppercase", color: "#64748b", fontSize: "0.75rem" }}>
          404
        </p>
        <h1 style={{ fontSize: "2rem", fontWeight: 600, marginTop: "0.5rem" }}>页面未找到</h1>
        <p style={{ color: "#94a3b8", marginTop: "0.25rem" }}>请检查链接或返回首页。</p>
      </div>
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.6rem 1.2rem",
          borderRadius: "9999px",
          background: "#0f172a",
          color: "white",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        返回首页
      </a>
    </div>
  )
}
