import fs from "fs";

const path = "./src/game/cards/cards.ts";
let content = fs.readFileSync(path, "utf8");

content = content.replace(/new URL\("\.\.\/\.\.\/assets\/(cards|card-backs)\/(.*?)", import\.meta\.url\)\.href/g, '"/$1/$2"');

fs.writeFileSync(path, content);
console.log("Done");
