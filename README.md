# DryCamping.com

Static RV dry-camping publication deployed by Cloudflare Pages from the main branch. No build command or dependencies required; the repository root is the publish directory.

## Site structure
- Homepage: index.html
- Guides and calculators: one directory per route, each containing index.html
- Shared presentation and interactions: assets/site.css and assets/app.js
- Real robots.txt, XML sitemap, and 404.html (disables Pages SPA fallback)
- _headers: response security headers and asset caching

## Updating
Edit the relevant HTML and shared assets. Keep canonical URLs, metadata, source references, and sitemap dates consistent with substantive changes. Push to main to deploy. Other branches produce preview deployments.

## Calculator assumptions
Battery: fully charged nominal capacity × usable fraction, divided by daily battery-side deficit. This is a daily-average model, not an overnight/peak-load simulation.
Water: minimum of fresh water after reserve, free gray capacity, and free black capacity divided by their daily demands.
Solar: battery-side daily energy × planning margin divided by peak sun hours and overall delivery factor, rounded upward to 50 W.
All defaults are illustrative; no universal runtime promises.

## Editorial and privacy
Source-linked, AI-assisted general guides; no fabricated firsthand tests. Hero image is AI-generated and illustrative. No affiliate links or site-installed analytics at launch. Checklist progress stays in browser localStorage.

## Traffic strategy
Launch around specific practical questions: RV battery runtime, water and waste-tank duration, solar sizing, a printable dry-camping checklist, and a beginner guide. Broad definition queries are already competitive. Tools are also competitive; original clarity, formulas, and useful cross-links are the differentiation, not an assumed uncontested niche.

Research date: September 24, 2026. Search-result review found established RV retailers/rental publishers on beginner terms and multiple competitors on calculators. No paid keyword-volume data was available, so no traffic forecast is claimed.

Search Console and Bing Webmaster Tools verification/submission still require the owner's accounts. This repository intentionally contains no invented verification tokens or analytics IDs.
