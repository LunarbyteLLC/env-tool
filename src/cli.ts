import {Command} from 'commander';
import {audit, initSchema, loadSchema, scanVars, syncEnvFile, validate} from "./lib";
import process from "process";
import fs from "fs";
import {parse} from "dotenv";

export function createCli() {

    const DEFAULT_SCHEMA_FILE = './envconfig.json';

    const program = new Command();
    
    program
        .name('env-tool')
        .description('A tool to manage environment variables in TypeScript/JavaScript projects')
        .version('1.0.4');

    program.command('init')
        .arguments('<dir>')
        .description('Scan project files and create an environment schema')
        .option('-f, --force', 'Overwrite existing schema file', false)
        .option('--no-git', 'Disable Git tracking for file scanning')
        .action((dir, options) => {
            if (fs.existsSync(DEFAULT_SCHEMA_FILE) && !options.force) {
                process.exitCode = 1;
                console.warn(`${DEFAULT_SCHEMA_FILE} already exists. Use -f to overwrite if you want to start over.`)
                return;
            }
            const vars = scanVars(dir, options.git);
            const out = initSchema(vars);
            fs.writeFileSync(DEFAULT_SCHEMA_FILE, JSON.stringify(out, null, 4))
            console.log(`Created schema file at ${DEFAULT_SCHEMA_FILE}`);
        })

    program.command('audit')
        .arguments('<dir>')
        .description('Audit project files for environment variables not in the schema')
        .option('--no-git', 'Disable Git tracking for file scanning')
        .action((dir, options) => {
            const vars = scanVars(dir, options.git);
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);
            const issues = audit(vars, schema);
            if (issues.length > 0) {
                console.warn( issues.join('\n'))
                process.exitCode = 1;
            } else {
                console.log('No issues found. All environment variables are in the schema.');
            }
        })

    program.command('validate')
        .arguments('<envfile>')
        .description('Validate an env file against the schema')
        .action((envfile) => {
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);
            const envContent = fs.readFileSync(envfile);
            const parsedEnv = parse(envContent);
            const issues = validate(schema, parsedEnv);
            if (issues.length > 0) {
                const issueLabels = {
                    no_value: 'has no value',
                    not_defined: 'is not defined'
                }
                process.exitCode = 1;
                console.warn(
                    issues.map(iss => `${iss.key} ${issueLabels[iss.error]} in ${envfile}`).join('\n')
                );
            } else {
                console.log(`${envfile} is valid.`);
            }
        });

    program.command('sync')
        .arguments('<envfile>')
        .description('Sync an env file with the schema')
        .action((envfile) => {
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);

            let envContent: Buffer;
            try {
                envContent = fs.readFileSync(envfile);
                console.log(`Updating ${envfile} with schema values...`);
            } catch(e: any) {
                envContent = Buffer.from('');
                console.log(`Creating new ${envfile} from schema...`);
            }
            const parsedEnv = parse(envContent);
            const contents = syncEnvFile(schema, parsedEnv);
            fs.writeFileSync(envfile, contents);
            console.log(`${envfile} has been updated.`);
        });

    return program;
}

