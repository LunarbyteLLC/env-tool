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

#### Option 1: Quick Setup

The quickest way to add env-tool to your project:

```shell
# Install the package
npm install --save-dev @lunarbyte/env-tool

# Run the setup script to add scripts to your package.json
npx env-tool-init
```

This will automatically:
1. Install the package in your project
2. Add the necessary scripts to your package.json
3. Detect your source directory

You can also specify a custom source directory:

```shell
npx env-tool-init --dir path/to/source
```

#### Option 2: Manual Setup

1. Add the env-tool to your project:

```shell
npm install --save-dev @lunarbyte/env-tool
```

2. Add scripts to your package.json:

```json
"scripts": {
  "env-tool": "env-tool",
  "env:init": "env-tool init <directory>",
  "env:audit": "env-tool audit <directory>",
  "env:validate": "env-tool validate .env",
  "env:sync": "env-tool sync .env"
}
```

### Global Installation

If you prefer a global installation:

```shell
npm install -g @lunarbyte/env-tool
```

## Getting Started

1. Initialize the environment schema:

```shell
# Using project installation
npm run env:init

# Using global installation
env-tool init src/
```

This will create an `envconfig.json` file in your project root with all the `process.env` variables found in your code.

2. Update the generated schema with appropriate comments, required flags, and default values.

3. Sync your `.env` file with the schema:

```shell
# Using project installation
npm run env:sync

# Using global installation
env-tool sync .env
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