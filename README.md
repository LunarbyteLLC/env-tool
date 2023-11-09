# Envtool

## Installation

Coming soon

## Usage

### Audit

List usages of `process.env` variables in your code. Does not write any files.


```shell
npx env-tool audit example/
```
### Init

`init` will extract all the usages of `process.env` variables and create a schema file. 
The schema file is used for validating your `.env` file and syncing it with future changes. 

```shell
# create a schema by scanning the example/ directory
npx env-tool init example/
```

### Create

Create a well-formed env file based on the schema.  This will overwrite any file that already exists
with the same name. **Proceed with caution**.
```shell
npx env-tool create .env
```


### Validate

Compare your current `.env` file against the schema. Checks for undefined variables that
are required, or variables with no value that are required.

```shell
npx env-tool validate .env
```


### Sync

As the project changes, you may want to update your env file to declare the latest variables. 
This will overwrite the current env file, but keeps your existing values. New variables are declared 
with any applicable default values.


```shell
npx env-tool sync .env
```