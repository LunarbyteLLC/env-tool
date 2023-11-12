# Envtool

## Installation

Generate a new github personal access token
https://github.com/settings/tokens/new?scopes=read:packages&description=npm-package-manager


Edit `.npmrc` in your home directory and add the following lines. 
Replace `<your_github_personal_token>` with the token you just generated.
```text
@lunarbytellc:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=<your_github_personal_token>
```

Finally run `npm install -g @lunarbytellc/env-tool`. 

Run it to see the help description.
```shell
env-tool
```

## Usage

### Audit

List usages of `process.env` variables in your code. Does not write any files.
Use this command to check for undocumented references to  `process.env` variables.
You might run this in your CI system to prevent deploying a new feature and forgetting to set up some API_KEY env variable. 


```shell
env-tool audit example/
```
### Init

`init` will extract all the usages of `process.env` variables and create a schema file. 
The schema file is used for validating your `.env` file and syncing it with future changes. 

```shell
# create a schema by scanning the example/ directory
env-tool init example/
```

### Create

Create a well-formed env file based on the schema.  This will overwrite any file that already exists
with the same name. **Proceed with caution**.
```shell
env-tool create .env
```


### Validate

Compare your current `.env` file against the schema. Checks for undefined variables that
are required, or variables with no value that are required.

```shell
env-tool validate .env
```


### Sync

As the project changes, you may want to update your env file to declare the latest variables. 
This will overwrite the current env file, but keeps your existing values. New variables are declared 
with any applicable default values.


```shell
env-tool sync .env
```