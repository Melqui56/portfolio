# Portfolio

Base of my professional portfolio: website + documentation.

This repository holds the **vision, decisions, and architecture documentation** for the portfolio, the website code, and the API that powers it.

## Structure

```
Portfolio/
├── docs/            # Portfolio documentation
│   ├── README.md    # Documentation index
│   ├── VISION.md    # Purpose, audience, guiding principles
│   ├── CONTENT.md   # Content strategy and tone
│   └── DECISIONS.md # ADRs (the portfolio is a product)
├── apps/site/       # Astro 7 site (bilingual EN/ES) — deploys to Cloudflare Workers
├── services/api/    # Go API + Postgres (contact signals, etc.)
├── deploy/          # Local dev infra (Postgres + Caddy) for the API
└── Makefile         # Dev, build, deploy, and API commands
```

## Current status

- [x] Repository initialized
- [x] Base documentation (vision, profile)
- [x] Site design and implementation (Astro 7, static)
- [x] SEO baseline: canonical/hreflang, sitemap, OG image, robots, JSON-LD
- [x] Cloudflare Workers deployment config (`apps/site/wrangler.jsonc`)
- [ ] Define value proposition and real content (case studies)
- [ ] Deploy site to Cloudflare Workers
- [ ] Deploy API + Postgres

## Deploying the site (Cloudflare Workers)

The site is fully static, so no adapter is needed — Wrangler serves the build
directory as static assets.

```sh
cd apps/site
bun run deploy        # = astro build && wrangler deploy
```

Custom domain: `mqestudios.com` (set in `apps/site/wrangler.jsonc` + dashboard).

Set `PUBLIC_API_URL` at build time so the contact form posts to the deployed API
(see `apps/site/.env.example`).