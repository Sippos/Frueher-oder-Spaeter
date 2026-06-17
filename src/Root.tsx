import { useState, useEffect } from "react";
import App from "./App";
import CardGallery from "./components/CardGallery";

export default function Root() {
  const [playMode, setPlayMode] = useState<"local" | "multiplayer" | null>(null);

  const [showHandbuch, setShowHandbuch] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("room")) {
      setPlayMode("multiplayer");
    }
  }, []);

  if (showGallery) {
    return <CardGallery onClose={() => setShowGallery(false)} />;
  }

  if (showHandbuch) {
    return (
      <main className="app" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "10px", backgroundColor: "#1e1311", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "0 10px" }}>
          <h1 style={{ margin: 0, color: "#fff4df", fontSize: "1.5rem" }}>Handbuch</h1>
          <button className="secondary-button" onClick={() => setShowHandbuch(false)} type="button">Schließen</button>
        </div>
        <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "20px", borderRadius: "12px", backgroundColor: "#2e1f1a", border: "2px solid #6e3e2f" }}>
          <img src="/handbuch/page-1.jpg" alt="Handbuch Seite 1" style={{ width: "100%", maxWidth: "800px", borderRadius: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }} />
          <img src="/handbuch/page-2.jpg" alt="Handbuch Seite 2" style={{ width: "100%", maxWidth: "800px", borderRadius: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }} />
        </div>
      </main>
    );
  }

  if (playMode) {
    return <App initialPlayMode={playMode} />;
  }

  return (
    <main className="app onboarding-app onboarding-app--sleek" style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      
      {/* Top-Left Card Gallery Button */}
      <button 
        className="menu-button" 
        onClick={() => setShowGallery(true)} 
        type="button" 
        style={{ 
          position: "absolute", 
          top: "20px", 
          left: "20px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "8px" 
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="14" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="21" x2="22" y2="21"></line>
          <line x1="22" y1="21" x2="22" y2="7"></line>
          <line x1="16" y1="7" x2="22" y2="7"></line>
        </svg>
        Karten ansehen
      </button>

      <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "400px", background: "radial-gradient(circle at top left, rgba(245, 239, 231, 0.18), transparent 34%), linear-gradient(180deg, rgba(58, 33, 27, 0.96), rgba(36, 19, 15, 0.98))", padding: "40px 20px", borderRadius: "28px", border: "2px solid #6e3e2f", boxShadow: "0 24px 70px rgba(0, 0, 0, 0.42)" }}>
        <div style={{ textAlign: "center", width: "100%" }}>
          <h1 style={{ margin: 0, color: "#fff4df", fontSize: "clamp(2.2rem, 5vw, 3.55rem)", lineHeight: 1.05 }}>Früher oder Später</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: "280px", gap: "16px", margin: "0 auto" }}>
          <button className="menu-button" onClick={() => setPlayMode("local")} type="button" style={{ width: "100%" }}>
            Lokal spielen
          </button>
          <button className="menu-button" onClick={() => setPlayMode("multiplayer")} type="button" style={{ pointerEvents: "auto", width: "100%" }}>
            Online spielen
          </button>
          <button className="menu-button" disabled type="button" style={{ width: "100%", pointerEvents: "auto" }}>
            Gegen CPU
          </button>
          <button className="menu-button" onClick={() => setShowHandbuch(true)} type="button" style={{ width: "100%", pointerEvents: "auto" }}>
            Handbuch
          </button>
        </div>
      </section>
    </main>
  );
}
