import { useState } from "react";
import App from "./App";
import "./MainMenu.css";

type Screen = "menu" | "local" | "cpu" | "online" | "rules";

export default function Root() {
  const [screen, setScreen] = useState<Screen>("menu");
  if (screen === "local") return <App />;
  return <main className="main-menu-app"><section className="main-menu-panel"><p className="eyebrow">Kartenspiel</p><h1>Früher oder Später?</h1><p>Wähle einen Spielmodus oder lies zuerst kurz im