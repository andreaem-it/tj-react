/**
 * Worker Node.js per Price Radar: batch scraping prudente su SQLite.
 *
 * Esempio crontab (ogni 15 minuti, primo campo: 0,15,30,45 oppure equivalente):
 *   0,15,30,45 * * * * cd /percorso/techjournal-clone && npm run price-radar:cron >> /var/log/price-radar-cron.log 2>&1
 *
 * Richiede: `npm run price-radar:init` e variabile PRICE_RADAR_SQLITE_PATH se usi un path custom.
 */
import { runPriceRadarScrapeBatch } from "../lib/priceRadar/scrapeBatch";

runPriceRadarScrapeBatch()
  .then(({ processed, errors }) => {
    console.log(
      `[price-radar-cron] ${new Date().toISOString()} processed=${processed} errors=${errors}`
    );
    process.exit(0);
  })
  .catch((e) => {
    console.error("[price-radar-cron]", e);
    process.exit(1);
  });
