import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const NAVY = "#101d33";
const GOLD = "#b8924c";

function monogramSvg({ size, padding }) {
  const inner = size - padding * 2;
  const fontSize = Math.round(inner * 0.52);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${NAVY}"/>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="${GOLD}"
      >VC</text>
    </svg>
  `;
}

async function renderPng(svg, size, filename) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(outDir, filename));
  console.log("wrote", filename);
}

async function main() {
  // Standard icons (no safe-zone padding needed, full-bleed background).
  await renderPng(monogramSvg({ size: 192, padding: 0 }), 192, "icon-192.png");
  await renderPng(monogramSvg({ size: 512, padding: 0 }), 512, "icon-512.png");
  // Maskable icon needs extra safe padding so OS masks (circle, squircle) don't clip the glyph.
  await renderPng(monogramSvg({ size: 512, padding: 96 }), 512, "icon-512-maskable.png");
  // Apple touch icon (iOS ignores manifest icons, reads this directly).
  await renderPng(monogramSvg({ size: 180, padding: 0 }), 180, "apple-touch-icon.png");

  // Favicon (32px) written to public/ root, replacing the placeholder next.svg-era favicon.ico reference stays as-is.
  await sharp(Buffer.from(monogramSvg({ size: 32, padding: 0 })))
    .resize(32, 32)
    .png()
    .toFile(join(__dirname, "..", "public", "icon-32.png"));
  console.log("wrote icon-32.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
