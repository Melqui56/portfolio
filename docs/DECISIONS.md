# Portfolio Decisions (ADR)

Record of architecture and product decisions for the portfolio itself (reminder: the portfolio is a product). Format: context → decision → consequences.

## ADR-000: Initial repository structure

- **Date**: 2026-09-02
- **Status**: Accepted

### Context

Start from scratch, unbiased by existing projects. A base is needed that separates the public (site + docs) from the private (profile, personal context).

### Decision

- Root folder `Portfolio/` as an independent git repo (branch `main`).
- `docs/` with vision, content, and decisions documentation.
- `docs/private/` gitignored for personal material that is not published.

### Consequences

- The repo can be published as-is without leaking personal data.
- Private content feeds the public one without being exposed.

## ADR-001: Documentation language

- **Date**: 2026-09-02
- **Status**: Accepted

### Context

Initial documentation was written in Spanish. The portfolio site will be bilingual (ES/EN), but internal documentation should have a single source of truth.

### Decision

- All documentation in this repository is written in English.
- Private material (profile, context) is also maintained in English.

### Consequences

- Single source of truth for the site's English version and for future translations.
- Spanish site content is derived from the English documentation during the writing phase.

## ADR-002: Site deploys to Cloudflare Workers (static assets)

- **Date**: 2026-09-03
- **Status**: Accepted

### Context

The site is a fully static Astro build (view transitions + vanilla scripts; no
server routes). It needs a deployment target with the custom domain
`mqestudios.com`. Options considered: self-host with Caddy (previous plan),
Cloudflare Pages, Cloudflare Workers.

### Decision

- Deploy the Astro site to **Cloudflare Workers as static assets** via Wrangler
  (`apps/site/wrangler.jsonc`), no adapter — the site has no on-demand rendering.
- Domain: `mqestudios.com`.
- The Go API + Postgres (`services/api/`, `deploy/`) remain self-hosted; the
  contact form points at it via `PUBLIC_API_URL`.

### Consequences

- Deploy is a single command: `bun run deploy` (`astro build && wrangler deploy`).
- Zero server runtime on the edge for the site; JS is reduced to the Pixi hero
  on the Deck plus tiny per-page scripts (no React/Motion).
- The API stays on a VM; CORS and a public URL are required for the form.

## ADR-003: Drop React and Motion from the client

- **Date**: 2026-09-03
- **Status**: Accepted

### Context

The four islands (Reveal, Poster3D, ContactForm, OceanBackground) pulled in
React (~184KB) and Motion (~120KB) on every page, dwarfing the actual feature
code. All of them are small, self-contained interactions.

### Decision

- Rewrite the four components as framework-free Astro components + vanilla TS
  (`src/lib/site.ts`, `src/components/ocean/OceanBackground.ts`).
- Remove `react`, `react-dom`, `motion`, and `@astrojs/react`.
- Defer the Pixi hero to `requestIdleCallback` and code-split it so it only
  loads on the Deck.

### Consequences

- Non-Deck pages ship ~19KB of JS instead of ~300KB.
- View-transition re-mounting is handled manually (`astro:page-load` /
  `astro:before-swap`) instead of by React hydration.
- Reveal-on-scroll is gated on a `js` class, so no-JS visitors still see all content.