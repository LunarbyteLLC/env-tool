# Envtool

## Installation

### In your current project
```shell
npm install @lunarbyte/env-tool
```

### Global install
```shell
npm install -g @lunarbyte/env-tool
```

## Usage

### Init

`init` will extract all the usages of `process.env` variables and create a schema file.
The schema file is used for validating your `.env` file and syncing it with future changes.

```shell
# create a schema by scanning the example/ directory
env-tool init example/
```


### Audit

List usages of `process.env` variables in your code. Does not write any files.
Use this command to check for undocumented references to  `process.env` variables.
You might run this in your CI system to prevent merging code that introduces a new env 
variable without documenting it. 

```shell
env-tool audit example/
```

### Validate

Compare your current `.env` file against the schema. Checks for undefined variables that
are required, or variables with no value that are required. You might run this during your
deployment process to prevent deploying code that requires some new environment variable
which has not been configured. 

```shell
env-tool validate .env
```


### Sync

Creates or updates an env file.

As the project changes, you may want to update your env file to declare the latest variables. 
This will overwrite the current env file, but keeps your existing values. New variables are declared 
with any applicable default values.


```shell
env-tool sync .env
```