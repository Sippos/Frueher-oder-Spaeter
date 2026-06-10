import { useState } from "react";
import App from "./App";

type Screen = "menu" | "local";

export default function Root() {
  const [screen, setScreen] = useState<Screen>("menu");
  if (screen === "local") return <App />;
  return <main className="app"><section className="onboarding-panel"><h1>Früher oder Später?</h1><button className="primary-button" onClick={() => setScreen("local")} type="button">Lokal spielen