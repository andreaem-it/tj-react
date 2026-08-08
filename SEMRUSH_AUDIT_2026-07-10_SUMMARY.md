# Semrush audit summary - 2026-07-10

## HTTP status
- 429: 63 URL
- 200: 36 URL

## Non-200 examples
- 429 https://techjournal.it/
- 429 https://techjournal.it/llms.txt
- 429 https://techjournal.it/robots.txt
- 429 https://techjournal.it/sitemap.xml
- 429 https://www.techjournal.it
- 429 https://www.techjournal.it/
- 429 https://www.techjournal.it/apple
- 429 https://www.techjournal.it/apple/apple-acquisisce-play-app-premiata-prototipi-swiftui
- 429 https://www.techjournal.it/apple/apple-aumenta-prezzi-mac-ipad-apple-watch-homepod-apple-tv-italia-nuovi-importi
- 429 https://www.techjournal.it/apple/apple-preoccupata-fuga-dati-iphone-18-pro-fornitore-tata
- 429 https://www.techjournal.it/apple/apple-rilascia-beta-3-ios-26-6-novita
- 429 https://www.techjournal.it/apple/iphone-18-pro-indizio-dark-cherry-sim-tray
- 429 https://www.techjournal.it/apps
- 429 https://www.techjournal.it/compatibility
- 429 https://www.techjournal.it/gaming
- 429 https://www.techjournal.it/gaming/apple-arcade-aggiunge-5-giochi-quiz-city-builder-pesca-disegno-roguelike
- 429 https://www.techjournal.it/guide
- 429 https://www.techjournal.it/ia
- 429 https://www.techjournal.it/ia/apple-aggiorna-creator-studio-pages-keynote-numbers-30-giugno-2026

## Issue columns with affected pages
- 4xx errors: 62 pages
- Low text to HTML ratio: 35 pages
- Broken internal links: 35 pages
- Title element is too long: 34 pages
- Pages with only one internal link: 2 pages
- No HSTS support: 2 pages
- Sitemap.xml not found: 1 pages
- Robots.txt not found: 1 pages
- Llms.txt not found: 1 pages
- Incorrect pages found in sitemap.xml: 1 pages

## Interpretation
- 63 of 99 crawled URLs returned 429, so many missing metadata/structured-data findings are crawler-block side effects.
- Broken internal links are reported on 35 source pages, but this export contains counts per page, not the destination URL of each broken link.
- The repo-side fixes applied here cover HSTS, host canonicalization, long article titles, and sitemap hygiene.
