import { useState } from "react";
import App from "./App";

export default function Root() {
  const [hasStarted, setHasStarted] = useState(false);

  if (hasStarted) {
    return <App />;
  }

  return (
    <main className="app onboarding-app onboarding-app--sleek">
      <section className="onboarding-panel onboarding-panel--sleek">
        <div className="onboarding-copy onboarding-copy--sleek">
          <p className="eyebrow">Kartenspiel</p>
          <h1>Früher oder Später?</h1>
          <p>Starte eine lokale Partie und richte danach Decks, Startmonster und Spielbrett ein.</p>
        </div>

        <div className="setup-actions">
          <button className="primary-button" onClick={() => setHasStarted(true)} type="button">
            Lokal spielen
          </button>
          <button disabled type="button">Gegen CPU</button>
          <button disabled type="button">Online spielen</button>
          <button disabled type="button">Handbuch</button>
        </div>
      </section>
    </main>
  );
}
