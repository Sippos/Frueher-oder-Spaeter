import { useState } from "react";
import App from "./App";
import "./MainMenu.css";

type MenuScreen = "main" | "local" | "cpu" | "online" | "rules";

type MenuAction = {
  id: MenuScreen;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  primary?: boolean;
};

const menuActions: MenuAction[] = [
  {
    id: "cpu",
    eyebrow: "Solo",
    title: "Gegen CPU spielen",
    description: "Sp