# @lunarbyte/env-tool

Stop managing environment variables manually. This CLI scans your codebase for `process.env` usages, generates a schema, and validates your `.env` files—with optional encrypted secrets via [dotenvx](https://github.com/dotenvx/dotenvx).

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

### Managing Secrets

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

### 2. Copy Current Production Values

```bash
# SSH to your server, copy current .env contents
# Then locally:
cd env/prod
# Paste values using dotenvx set for each secret:
dotenvx set DATABASE_URL "your-prod-value"
dotenvx set API_KEY "your-prod-value"
# ... repeat for each var
```

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
    "comment": "Postgres connection string"
  }
}
```

- `required: true` → `validate` fails if missing or empty
- `default` → Used by `sync` when creating new `.env` entries
- `comment` → Added as `###` comments in generated `.env` files

---

## Workflow Summary

| Scenario | Command |
|----------|---------|
| New project setup | `env-tool init src/ --with-dotenvx` |
| New developer onboarding | `npm run env:sync` |
| Added new env var to code | `npm run env:init --force` then `npm run env:sync` |
| Pre-merge CI check | `env-tool audit src/` |
| Pre-deploy validation | `env-tool validate env/prod/.env` |
| Update a secret | `cd env/prod && dotenvx set KEY value` |

---

## License

MIT
