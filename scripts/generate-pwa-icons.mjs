/**
 * Genera le icone quadrate richieste per l'installabilità PWA.
 *
 * Si esegue a mano quando cambia il marchio, non a ogni build: le icone sono
 * asset statici versionati, e rigenerarle in CI vorrebbe dire far dipendere il
 * build da `sharp` per un file che cambia una volta all'anno.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * ## Perché serve
 *
 * Il manifest dichiarava una sola icona da 1135×1069, cioè **non quadrata**:
 * Chrome la scarta e il sito non risulta installabile. I formati richiesti sono
 * 192 e 512 quadrati, più una variante `maskable` con margine di sicurezza per i
 * lanciatori Android che ritagliano l'icona in una forma arbitraria.
 *
 * L'icona di partenza viene solo centrata su una tela quadrata: nessun ritaglio,
 * quindi il marchio non viene alterato.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

/** Fondo della tela: lo stesso `background_color` del manifest. */
const BACKGROUND = { r: 26, g: 26, b: 26, alpha: 1 };

const SOURCE = "assets/techjournal-icon-transparent.png";
const OUT_DIR = "public/icons";

/**
 * Margine della variante `maskable`.
 *
 * I lanciatori Android ritagliano fino al 20% per lato: senza margine il
 * marchio viene tagliato. Il 10% per lato lascia il contenuto dentro la
 * "safe zone" raccomandata.
 */
const MASKABLE_PADDING = 0.1;

async function square(size, { padding = 0 } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { ...BACKGROUND, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

await mkdir(OUT_DIR, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, padding: 0.06 },
  { file: "icon-512.png", size: 512, padding: 0.06 },
  { file: "icon-maskable-512.png", size: 512, padding: MASKABLE_PADDING },
];

for (const { file, size, padding } of targets) {
  const buffer = await square(size, { padding });
  await sharp(buffer).toFile(`${OUT_DIR}/${file}`);
  console.log(`${OUT_DIR}/${file}  ${size}x${size}`);
}

