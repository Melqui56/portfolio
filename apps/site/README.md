# MQE Site (Astro)

Bilingual (EN/ES) portfolio for **Melqui Casallas / MQE Studios**. Astro 7,
static-first, zero client framework — all interactivity is vanilla TypeScript.

## Stack

- **Astro 7** with View Transitions (`ClientRouter`)
- **Tailwind CSS v4** (CSS-first tokens, `@theme`)
- **Pixi.js v8** — the night-sea hero on the Deck (`OceanBackground`)
- **@tailwindcss/typography** for rendered MDX (projects / journal)
- **@astrojs/sitemap** — auto-generates the XML sitemap
- i18n native (EN default, ES under `/es`)

There is **no React/Motion** on the client anymore. Reveal-on-scroll, the poster
tilt, the contact form, and the ocean scene are all framework-free modules under
`src/lib/` and `src/components/ocean/`.

## Commands

| Command             | Action                                    |
| :------------------ | :---------------------------------------- |
| `bun dev`           | Dev server at `localhost:4321`            |
| `bun build`         | Production build to `./dist/`             |
| `bun preview`       | Preview the build locally                 |
| `bun run cf:preview`| Build + preview via Wrangler (`wrangler dev`) |
| `bun run deploy`    | Build + deploy to Cloudflare Workers      |

## Env

Copy `.env.example` to `.env` and fill in:

- `PUBLIC_SITE_URL` — canonical/hreflang/sitemap origin (defaults to `https://mqestudios.com`)
- `PUBLIC_API_URL` — contact form endpoint (defaults to `http://localhost:8081/api/v1`)

## Deploy (Cloudflare Workers)

The site is fully static, so Wrangler serves `./dist` as static assets — no
adapter required. Config lives in `wrangler.jsonc` (name `mqestudios`,
`not_found_handling: "404-page"` serves `dist/404.html` for any unknown route).

```sh
bun run deploy
```

From the repo root: `make deploy`.

## Structure

```
src/
├── components/          # Astro components + vanilla modules
│   ├── ocean/           # Pixi scene (OceanBackground.ts + ship.ts)
│   └── sections/        # One component per page section
├── content/             # Content collections (projects, posts)
├── i18n/                # ui.ts (labels), sections.ts (nav/section registry)
├── layouts/             # BaseLayout (SEO, header/footer, client init)
├── lib/                 # site.ts (client behaviour), api.ts (fetch)
└── pages/               # Routes (EN + /es tree), 404
```