import { useState } from "react";
import App from "./App";
import "./MainMenu.css";

type Screen = "menu" | "local" | "cpu" | "online" | "rules";

export default function Root() {
  const [screen, setScreen] = useState<Screen>("menu");

  if (screen === "local") return <App />;

  return (
    <main className="main-menu-app">
      <section className="main-menu-panel">
        <p className="eyebrow">Kartenspiel