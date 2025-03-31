# Envtool

A TypeScript/JavaScript environment variable management tool that helps ensure consistent usage of environment variables across different environments in your projects.

## Features

- Scan your codebase for all `process.env` usages
- Generate and maintain an environment schema file (`envconfig.json`)
- Validate your `.env` files against the schema
- Sync your `.env` files with new environment variables
- Audit your codebase for undocumented environment variables

## Installation

### Project Installation

The quickest way to add env-tool to your project:

```shell
# Install the package
npm install --save-dev @lunarbyte/env-tool

# Initialize env-tool in your project
npx env-tool init <directory>/
```

This will automatically:
1. Install the package in your project
2. Add the necessary scripts to your package.json
3. Create an initial schema file
4. Detect and scan your source directory for environment variables

You can customize the initialization with these options:
```shell
# Specify a custom source directory
env-tool init path/to/source

# Skip Git ignore rules
env-tool init <directory>/ --no-git

# Skip adding scripts to package.json
env-tool init <directory>/ --no-scripts

# Force overwrite existing schema
env-tool init <directory>/ --force
```

### Global Installation

If you prefer a global installation:

```shell
npm install -g @lunarbyte/env-tool
```

## Getting Started

After installation, env-tool will have:
1. Created an `envconfig.json` file with all detected environment variables
2. Added convenient npm scripts to your package.json

Next steps:

1. Review and update the generated schema:
   - Set appropriate default values
   - Add meaningful comments
   - Set required flags according to your needs

2. Sync your .env file with the schema:
```shell
npm run env:sync
```

3. Validate your .env file:
```shell
npm run env:validate
```

## Schema File Example

After running the `init` command, an `envconfig.json` file will be created that looks like this:

```json
{
  "PORT": {
    "required": true,
    "default": "3000",
    "comment": "Application port number"
  },
  "DATABASE_URL": {
    "required": true,
    "default": "postgres://user:password@localhost:5432/mydb",
    "comment": "Database connection string"
  },
  "NODE_ENV": {
    "required": true,
    "default": "development",
    "comment": "Application environment (development, production, test)"
  },
  "API_KEY": {
    "required": true,
    "default": "",
    "comment": "External API authentication key"
  }
}
```

You should review and update this file:
- Set appropriate default values
- Add meaningful comments 
- Set the required flag according to your needs

## Usage

### Init

Extracts all usages of `process.env` variables and creates a schema file (`envconfig.json`).
The schema file is used for validating your `.env` file and syncing it with future changes.

```shell
# Using project installation
npm run env:init

# Using global installation
env-tool init <directory-to-scan>

# Skip Git tracking (to include untracked files)
env-tool init <directory-to-scan> --no-git
```

By default, only files tracked by Git are scanned to avoid including dependency files. Use the `--no-git` flag to scan all files.

### Audit

Lists usages of `process.env` variables in your code that aren't in your schema.
Use this command to check for undocumented references to `process.env` variables.
Ideal for CI/CD pipelines to prevent merging code with undocumented environment variables.

```shell
# Using project installation
npm run env:audit

# Using global installation
env-tool audit <directory-to-scan>

# Skip Git tracking
env-tool audit <directory-to-scan> --no-git
```

### Validate

Compares your `.env` file against the schema. Checks for undefined or empty variables that are required.
Useful during deployment to prevent deploying code that requires unconfigured environment variables.

```shell
# Using project installation
npm run env:validate

# Using global installation
env-tool validate .env
```

### Sync

Creates or updates an env file based on your schema.
As your project evolves, you can update your `.env` file to include the latest variables.
This preserves your existing values while adding new variables with their default values.

```shell
# Using project installation
npm run env:sync

# Using global installation
env-tool sync .env
```

## Best Practices

1. Run `env:init` or `env:audit` in your CI/CD pipeline to catch undocumented environment variables
2. Run `env:validate` during deployment to ensure all required environment variables are configured
3. Commit your `envconfig.json` file to your repository
4. Use `env:sync` when onboarding new developers to generate their initial `.env` file

## License

ISC