import { useState } from "react";
import App from "./App";

type Screen = "menu" | "local" | "cpu" | "online" | "rules";

function Placeholder({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return (
    <main className="app onboarding-app onboarding-app--sleek">
      <section className="onboarding-panel onboarding-panel--sleek main-menu-panel">
        <p className="eyebrow">Früher oder Später