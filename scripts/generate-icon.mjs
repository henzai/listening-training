/**
 * Generate app icon: hand-drawn ○△□ arranged horizontally
 * Pink/purple neon glow on dark background
 */
import { writeFileSync } from "node:fs";

const S = 100;

// Hand-drawn circle (center ~25, 50, radius ~11)
// Imperfect bezier curves for organic feel
const circle = `M 36,49
  C 36,41 32,36 25,35
  C 18,35 14,41 14,50
  C 14,59 19,65 26,65
  C 33,64 37,58 36,49`;

// Hand-drawn triangle (center ~50, pointing up)
// Slightly wobbly lines, vertices not perfectly sharp
const triangle = `M 50,30
  C 49,31 42,48 39,55
  C 38,57 37,61 38,62
  C 40,63 54,63 61,62
  C 62,61 62,58 61,56
  C 58,49 52,33 50,30`;

// Hand-drawn square (center ~78, slightly imperfect)
const square = `M 69,39
  C 72,38 83,38 87,39
  C 88,40 88,55 87,61
  C 86,62 73,63 69,62
  C 68,61 68,43 69,39`;

// Hand-drawn horizontal line through the middle (slight wobble)
const line = `M 10,50 C 30,48 70,52 90,50`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="50%" stop-color="#e879f9"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feColorMatrix in="blur" type="matrix"
        values="0 0 0 0 0.85
                0 0 0 0 0.27
                0 0 0 0 0.94
                0 0 0 0.6 0" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${S}" height="${S}" rx="20" fill="#0f172a"/>
  <g filter="url(#glow)" stroke="url(#neon)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
    <path d="${line}"/>
    <path d="${circle}"/>
    <path d="${triangle}"/>
    <path d="${square}"/>
  </g>
</svg>`;

writeFileSync("public/favicon.svg", svg);
console.log("✓ Written public/favicon.svg");

try {
  const sharp = (await import("sharp")).default;
  const svgBuffer = Buffer.from(svg);

  await sharp(svgBuffer).resize(192, 192).png().toFile("public/icons/icon-192.png");
  console.log("✓ Written public/icons/icon-192.png (192x192)");

  await sharp(svgBuffer).resize(512, 512).png().toFile("public/icons/icon-512.png");
  console.log("✓ Written public/icons/icon-512.png (512x512)");
} catch (e) {
  console.error("PNG generation failed:", e.message);
}
