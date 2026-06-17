import { useState } from "react";
import { eyeDeck, fingerDeck } from "../game/cards/cards";
import eyeCoinUrl from "../assets/icons/eye_coin.webp";
import fingerCoinUrl from "../assets/icons/finger_coin.webp";

export default function CardGallery({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"eye" | "finger">("eye");
  
  const currentDeck = activeTab === "eye" ? eyeDeck : fingerDeck;
  
  return (
    <main className="app" style={{ display: "flex", flexDirection: "column", height: "100vh", padding: "10px", backgroundColor: "#1e1311", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: "10px", padding: "0 10px" }}>
        <div />
        <h1 style={{ margin: 0, color: "#fff4df", fontSize: "1.5rem", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px" }}>Karten-Galerie</h1>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="secondary-button" onClick={onClose} type="button">Schließen</button>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", padding: "0 10px", justifyContent: "center" }}>
        <button 
          className={activeTab === "eye" ? "primary-button" : "secondary-button"} 
          onClick={() => setActiveTab("eye")} 
          type="button"
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
        >
          <img src={eyeCoinUrl} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          Deck Auge
        </button>
        <button 
          className={activeTab === "finger" ? "primary-button" : "secondary-button"} 
          onClick={() => setActiveTab("finger")} 
          type="button"
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
        >
          <img src={fingerCoinUrl} alt="" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
          Deck Finger
        </button>
      </div>
      
      <div style={{ 
        flexGrow: 1, 
        overflowY: "auto", 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "20px", 
        padding: "20px", 
        borderRadius: "12px", 
        backgroundColor: "#2e1f1a", 
        border: "2px solid #6e3e2f" 
      }}>
        {currentDeck.map((card) => (
          <div key={card.id} style={{ display: "flex", justifyContent: "center" }}>
            <img 
              src={card.imagePath} 
              alt={card.name} 
              style={{ width: "100%", maxWidth: "240px", borderRadius: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }} 
            />
          </div>
        ))}
      </div>
    </main>
  );
}
