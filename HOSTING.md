# Running App Junkyard

## Static hosting

Use Node.js 24.13 or later. Run `npm run build` and serve the contents of `dist/` from an HTTPS static host. Paths are relative so the catalog also works under a subdirectory. The build contains plain JavaScript, CSS, metadata and app guides. A browser on the site runs the algorithms, renders the editors and exports files. Drafts are specific to that browser and origin.

The public GitHub Pages edition uses this mode. Self-hosters can use any ordinary HTTP server. Localhost is a secure context for browser APIs such as Web Crypto. When changing the set of source apps, deploy the newly built directory as a unit.

## Server with private backups

`npm start` builds a fresh copy of the site and serves it on `http://127.0.0.1:4173`. Set `WORKSPACE_ACCOUNTS=1` to also enable private accounts and a **Backups** button in every editor. The SQLite database stores password hashes, expiring sessions, and the five most recent saved revisions for each account and app. A person explicitly chooses when to save or restore. Browser drafts stay on the device after signing out.

For a local trial in PowerShell:

```powershell
$env:WORKSPACE_ACCOUNTS = "1"
npm start
```

For a local trial on macOS or Linux:

```sh
WORKSPACE_ACCOUNTS=1 npm start
```

Open an app, make a change, and choose **Backups → Create account**. Choose **Back up current draft**. Use **Restore** on another signed-in device to replace its browser draft. Handles use 3–40 letters, digits, dashes or underscores. Passwords have a 12-character minimum. Accounts belong to this installation.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Listening interface |
| `PORT` | `4173` | HTTP port |
| `WORKSPACE_ACCOUNTS` | off | Set to `1` to enable SQLite accounts and backup endpoints |
| `WORKSPACE_DB` | `.junkyard/workspaces.sqlite` | Persistent database filename |
| `PUBLIC_ORIGIN` | local HTTP origin | Canonical HTTPS origin, e.g. `https://studio.example.com`, for externally hosted accounts |
| `TRUSTED_PROXY_IP` | unset | Exact socket address of a reverse proxy that overwrites `X-Real-IP` with the client IP |

Serve the account-enabled version at the root of its origin. Terminate HTTPS at a reverse proxy and forward to the Node process. Set `PUBLIC_ORIGIN` to the exact browser origin and put `WORKSPACE_DB` on a persistent volume. The app uses a host-only HTTP-only session cookie, enables the Secure flag with HTTPS, and checks the origin on mutations.

Sign-in and registration share a limit of 30 attempts per ten minutes per IP. With a reverse proxy, configure the proxy to **overwrite** `X-Real-IP` on every request and set `TRUSTED_PROXY_IP` to its exact socket address as seen by Node. Other peers are limited by their socket IP. If this option is unset, clients behind the same proxy share its limit.

Keep the SQLite database and its backups outside the served directory. A SQLite-aware backup or a backup made after a clean shutdown preserves the database and journal state.

## Turning a fork into a hosted product

Use the per-app README for its supported formats and domain assumptions. Replace sample records and brand the shell in `web/`. The app's `mount(root, context)` entry point receives storage, notification and download adapters. The server's `server/accounts.js` owns identity and snapshots, so a product can substitute managed identity or a different data store without rewriting its calculation code.

The supplied hosted model is private accounts with manual snapshots. Customer billing, password recovery, workspaces shared between accounts and support for multiple server replicas require product-specific implementation. The SQLite store and its in-process sign-in limiter target a single server process. Registration is open when accounts are enabled.
