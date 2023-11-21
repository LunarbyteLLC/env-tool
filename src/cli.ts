import {Command, CommanderError} from 'commander';
import {audit, generateEnvFile, initSchema, loadSchema, scanVars, syncEnvFile, validate} from "./lib";
import process from "process";
import fs from "fs";
import {parse} from "dotenv";

export function createCli() {

    const DEFAULT_SCHEMA_FILE = './envconfig.json';

    const program = new Command();

    program.command('init')
        .arguments('<dir>')
        .option('-f --force', 'Overwrite existing schema file', false)
        .action((dir, options) => {
            if (fs.existsSync(DEFAULT_SCHEMA_FILE) && !options.force) {
                throw new CommanderError(1,'SCHEMA_EXISTS', `${DEFAULT_SCHEMA_FILE} already exists. Use -f to overwrite if you want to start over.`)
            }
            const vars = scanVars(dir);
            const out = initSchema(vars);
            fs.writeFileSync(DEFAULT_SCHEMA_FILE, JSON.stringify(out, null, 4))
        })

    program.command('audit')
        .arguments('<dir>')
        .action((dir) => {
            const vars = scanVars(dir);
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);
            const issues = audit(vars, schema);
            if (issues.length > 0) {
                throw new CommanderError(1, 'AUDIT_FAIL', issues.join('\n'))
            }
        })

    program.command('validate')
        .arguments('<envfile>')
        .action((envfile) => {
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);
            const envContent = fs.readFileSync(envfile);
            const parsedEnv = parse(envContent);
            const issues = validate(schema, parsedEnv);
            if (issues.length > 0) {
                throw new CommanderError(1, 'VALIDATE_FAIL', issues.join('/n'))
            }
        });

    program.command('sync')
        .arguments('<envfile>')
        .action((envfile) => {
            const schema = loadSchema(DEFAULT_SCHEMA_FILE);

            let envContent: Buffer;
            try {
                envContent = fs.readFileSync(envfile);

            } catch(e: any) {
                envContent = Buffer.from('')
            }
            const parsedEnv = parse(envContent);
            const contents = syncEnvFile(schema, parsedEnv);
            fs.writeFileSync(envfile, contents);
        });

    return program;
}

