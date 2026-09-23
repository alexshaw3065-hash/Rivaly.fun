"use client";

// Last resort when the root layout itself fails (it replaces the whole
// document, so no globals.css or nav) — still dark, still a way back, never
// a white screen.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Rivaly didn&rsquo;t load</p>
          <p style={{ fontSize: 14, color: "#8a8a8a", marginTop: 8 }}>Your money and rooms are safe. Give it another go.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              minHeight: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 6,
              background: "#3d6bff",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
