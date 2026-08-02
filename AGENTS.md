# AGENTS.md

## Cursor Cloud specific instructions

This is the **Victor Hugo / One-Click Hugo CMS** boilerplate (the "Kaldi" static-site
template). It is a single static-site product built with the Hugo static site generator,
bundled with Gulp 3 + Webpack 3, and edited via Netlify CMS. There is no database and no
backend service.

### Node version (important, non-obvious)
This is a 2018-era toolchain. Gulp 3.x is **incompatible with modern Node** — running any
gulp task (`yarn build`, `yarn start`, `yarn hugo`, `yarn webpack`) under Node 18+ fails with
`ReferenceError: primordials is not defined`. Use **Node 10** (10.24.1 is installed via nvm).

- Fresh interactive login shells auto-activate Node 10 (configured in `~/.bashrc`).
- The VM has an `/exec-daemon/node` (v22) earlier on `PATH` that shadows nvm. If
  `node --version` reports v22, activate Node 10 with:
  `export PATH="$HOME/.nvm/versions/node/v10.24.1/bin:$PATH"` (or `nvm use 10`).
- `yarn` (the package manager; `yarn.lock` is the lockfile) is installed globally under
  Node 10. Installing dependencies works under any Node version; only *running* gulp needs
  Node 10.

### Commands (run from repo root)
- Install deps: `yarn install`
- Dev server: `yarn start` — runs Hugo build + Webpack + PostCSS, then serves `./dist` via
  BrowserSync on **http://localhost:3000** (BrowserSync UI on **:3001**). It watches
  `site/**`, `src/js/**`, `src/css/**` and live-reloads on content/asset changes.
- Production build: `yarn build` (output → `dist/`). Preview build: `yarn build-preview`.
- Lint: `yarn lint` (ESLint over `src/`). Note: lint currently reports many **pre-existing**
  style errors in `src/js` — that is the repo's existing state, not a tooling failure.
- Tests: none exist (no test framework/scripts).

### Other notes
- The Hugo binary is vendored at `bin/hugo.{linux,darwin,exe}` (v0.46); no separate install.
- The Netlify CMS admin UI (`/admin/`) loads locally but its `git-gateway` backend requires
  Netlify Identity (cloud-hosted), so full CMS login/commit flows only work on a deployed
  Netlify site, not locally.
