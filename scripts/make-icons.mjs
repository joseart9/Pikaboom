// Generates PWA / Apple icons from an inline SVG. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

// scale = how much of the canvas the bomb fills (maskable icons need a safe zone)
const svg = (scale, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#6d28d9"/><stop offset="60%" stop-color="#2b0a57"/><stop offset="100%" stop-color="#1a0636"/>
    </radialGradient>
    <radialGradient id="body" cx="38%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#5a5a7a"/><stop offset="45%" stop-color="#23213a"/><stop offset="100%" stop-color="#0b0a16"/>
    </radialGradient>
    <radialGradient id="spark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff"/><stop offset="35%" stop-color="#ffe066"/><stop offset="100%" stop-color="#ff6b00" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(256 262) scale(${scale}) translate(-100 -105)">
    <circle cx="96" cy="118" r="66" fill="url(#body)" stroke="#0b0a16" stroke-width="5"/>
    <ellipse cx="72" cy="92" rx="18" ry="11" fill="#fff" opacity=".35" transform="rotate(-35 72 92)"/>
    <rect x="112" y="42" width="34" height="26" rx="6" fill="#3b3957" stroke="#0b0a16" stroke-width="5" transform="rotate(38 129 55)"/>
    <path d="M140 40 C 150 22, 168 30, 170 16" fill="none" stroke="#c9a36a" stroke-width="7" stroke-linecap="round"/>
    <circle cx="171" cy="14" r="22" fill="url(#spark)"/>
    <path d="M171 -2 L175 10 L187 14 L175 18 L171 30 L167 18 L155 14 L167 10 Z" fill="#fff6c2"/>
    <ellipse cx="80" cy="120" rx="7" ry="10" fill="#fff"/><ellipse cx="112" cy="120" rx="7" ry="10" fill="#fff"/>
    <circle cx="81" cy="123" r="4" fill="#0b0a16"/><circle cx="113" cy="123" r="4" fill="#0b0a16"/>
    <path d="M86 146 Q96 154 106 146" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;

const out = async (file, size, scale, rounded = false) => {
  await sharp(Buffer.from(svg(scale, rounded))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
};

await out("public/icons/icon-192.png", 192, 2.1);
await out("public/icons/icon-512.png", 512, 2.1);
await out("public/icons/maskable-512.png", 512, 1.6);
await out("src/app/apple-icon.png", 180, 2.1);
await out("src/app/icon.png", 64, 2.3, true);
writeFileSync("public/icons/icon.svg", svg(2.1, true));
