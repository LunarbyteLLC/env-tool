# @lunarbyte/env-tool

Stop managing environment variables manually. This CLI scans your codebase for `process.env` usages, generates a schema, validates your `.env` files, and can bulk-import existing secrets—with optional encrypted secrets via [dotenvx](https://github.com/dotenvx/dotenvx).

## Quick Start

```bash
npm install -g @lunarbyte/env-tool
cd your-project
env-tool init src/
```

That's it. You now have an `envconfig.json` schema and npm scripts ready to go.

---

## Commands

| Command | What it does |
|---------|--------------|
| `env-tool init <dir>` | Scan source code, create `envconfig.json`, add npm scripts |
| `env-tool audit <dir>` | Find `process.env` vars missing from schema (CI blocker) |
| `env-tool validate <envfile>` | Check `.env` file has all required vars |
| `env-tool sync <envfile>` | Update `.env` with new vars from schema |
| `env-tool import [file] -o <envfile>` | Import a plaintext env file (or stdin), encrypting `encrypted: true` schema keys |

### Init Options

```bash
env-tool init src/              # Basic setup
env-tool init src/ --with-dotenvx  # + encrypted secrets (recommended)
env-tool init src/ --force      # Overwrite existing schema
env-tool init src/ --no-scripts # Skip adding npm scripts
env-tool init src/ --no-git     # Include untracked files
```

---

## Encrypted Secrets with dotenvx

For projects where you want to **store encrypted secrets in your repo** (similar to Pulumi config), use:

```bash
env-tool init src/ --with-dotenvx
```

This creates:
```
env/
├── dev/
│   ├── .env          # Your dev environment variables
│   └── .env.keys     # Encryption key (auto-gitignored)
└── prod/
    ├── .env          # Your prod environment variables  
    └── .env.keys     # Encryption key (auto-gitignored)
```

### Bulk Importing Existing Secrets

Already have a plaintext `.env` file lying around (from a teammate, an old deploy script, or a server)? Import it directly instead of running `dotenvx set` for every variable one at a time:

```bash
# Import from a file
env-tool import plaintext.env --output env/prod/.env

# Import from stdin
cat plaintext.env | env-tool import --output env/prod/.env
pbpaste | env-tool import --output env/prod/.env
```

- Every schema key is written with its comment, using the same formatting as `sync` — the imported value wins if provided, otherwise the value already in the output file is kept, otherwise the schema default is used.
- Keys flagged `"encrypted": true` in `envconfig.json` are encrypted via dotenvx after writing; already-encrypted values are left alone.
- Values not documented in the schema (e.g. an existing `DOTENV_PUBLIC_KEY` line) are preserved as-is.
- If the output file doesn't already have a keypair, dotenvx bootstraps one automatically (adding `DOTENV_PUBLIC_KEY` to the file and writing the matching private key to `.env.keys`, which is auto-gitignored). If it already has a keypair, it's reused rather than rotated, so previously distributed `.env.keys` files keep working.

### Managing Secrets

For one-off changes to a single value, use dotenvx directly:

```bash
# Add/update a secret (encrypts automatically)
cd env/prod
dotenvx set DATABASE_URL "postgres://user:pass@host:5432/db"

# View decrypted values locally
dotenvx get DATABASE_URL

# Run your app with decrypted env
dotenvx run -- node server.js
```

### Deploying Encrypted Secrets

The `.env` files contain encrypted values safe to commit. On your server:

```bash
# Set the decryption key as an environment variable
export DOTENV_PRIVATE_KEY="your-private-key-from-.env.keys"

# Run with decryption
dotenvx run -- node server.js
```

---

## CI/CD Integration

### Pre-deploy Validation

Add to your deployment pipeline to catch missing env vars before they cause runtime errors:

```bash
npm install -g @lunarbyte/env-tool
env-tool validate .env
```

Exit code `1` = validation failed. Missing or empty required vars are logged.

### Audit in CI (Block Undocumented Vars)

Prevent merging code that references undocumented environment variables:

```bash
env-tool audit src/
```

Exit code `1` = found `process.env.SOMETHING` not in `envconfig.json`.

### Example: GitHub Actions

```yaml
# .github/workflows/env-check.yml
name: Environment Check
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @lunarbyte/env-tool
      - run: env-tool audit src/
```

### Example: Pre-deploy Script

```bash
#!/usr/bin/env bash
set -eo pipefail

ENV=$1
[[ -z $ENV ]] && echo "Usage: ./pre-deploy.sh <env>" && exit 1

# Validate env before deploying
npm install -g @lunarbyte/env-tool
env-tool validate "env/${ENV}/.env"

# Continue with build...
npm ci && npm run build
```

---

## Migrating from Manual Env Management

If you're currently SSHing into servers and editing `.env` files with nano, here's how to migrate:

### 1. Initialize env-tool

```bash
npm install -g @lunarbyte/env-tool
env-tool init src/ --with-dotenvx
```

### 2. Import Current Production Values

```bash
# SSH to your server, copy the current .env contents to your clipboard
# Then locally, pipe them straight into env-tool:
pbpaste | env-tool import --output env/prod/.env
```

Any key flagged `"encrypted": true` in `envconfig.json` (e.g. `DATABASE_URL`, `API_KEY`) is encrypted
automatically as part of the import — no need to run `dotenvx set` for each one individually. See
[Bulk Importing Existing Secrets](#bulk-importing-existing-secrets) above.

### 3. Commit Encrypted Env Files

```bash
git add envconfig.json env/
git commit -m "feat: add env management with encrypted secrets"
```

### 4. Update Deployment

On your server, set the decryption key once:

```bash
# Add to server's environment (systemd, docker, etc.)
DOTENV_PRIVATE_KEY="key-from-env/prod/.env.keys"
```

Then your deploy just needs:

```bash
dotenvx run -- node server.js
# or
dotenvx run -- npm start
```

**No more nano.** Update secrets locally, commit, deploy.

---

## Schema File (`envconfig.json`)

```json
{
  "PORT": {
    "required": true,
    "default": "3000",
    "comment": "Application port"
  },
  "DATABASE_URL": {
    "required": true,
    "default": "",
    "comment": "Postgres connection string",
    "encrypted": true
  }
}
```

- `required: true` → `validate` fails if missing or empty
- `default` → Used by `sync` (and `import`) when no other value is available
- `comment` → Added as `###` comments in generated `.env` files
- `encrypted: true` → Value is encrypted via dotenvx when brought in through `env-tool import`

---

## Workflow Summary

| Scenario | Command |
|----------|---------|
| New project setup | `env-tool init src/ --with-dotenvx` |
| New developer onboarding | `npm run env:sync` |
| Added new env var to code | `npm run env:init --force` then `npm run env:sync` |
| Bulk import/migrate existing secrets | `env-tool import prod.env -o env/prod/.env` |
| Pre-merge CI check | `env-tool audit src/` |
| Pre-deploy validation | `env-tool validate env/prod/.env` |
| Update a single secret | `cd env/prod && dotenvx set KEY value` |

---

## License

MIT — see [LICENSE](./LICENSE)
