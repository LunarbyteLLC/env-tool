import {Command} from 'commander';
import fs from "fs";
import path from "path";
import {parse} from "dotenv"
import process from "process";
const program = new Command();

const DEFAULT_SCHEMA_FILE = './envconfig.json';

function scanVars(dir: string) {
    const envVars = new Set<string>();

    function traverseDir(dir: string) {
        fs.readdirSync(dir).forEach(file => {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                traverseDir(fullPath);
            } else {
                const content = fs.readFileSync(fullPath).toString('utf-8');

                const matches = content.matchAll(/process\.env\.(\w+)/gm)
                for (const match of matches) {
                    envVars.add(match[1])
                }
            }
        });
    }

    traverseDir(dir);

    return envVars;
}

function loadSchema() {
    const contents = fs.readFileSync(DEFAULT_SCHEMA_FILE).toString('utf-8');
    const config = JSON.parse(contents);
    return config;
}

program.command('audit')
    .arguments('<dir>')
    .action((dir) => {

        const vars = scanVars(dir);
        for (const env of vars) {
            console.log(env);
        }
    })

program.command('init')
    .arguments('<dir>')
    .option('-f --force', 'Overwrite existing schema file', false)
    .action((dir, options) => {
        if (fs.existsSync(DEFAULT_SCHEMA_FILE) && !options.force) {
            console.error(`${DEFAULT_SCHEMA_FILE} already exists. Use -f to overwrite if you want to start over.`);
            process.exitCode = 1;
            return;
        }
        const vars = scanVars(dir);

        const out: {[key: string]: any} = {};
        for (const env of vars) {
            out[env] = {
                required: true,
                default: '',
                comment: 'This var does something useful'
            }
        }
        fs.writeFileSync(DEFAULT_SCHEMA_FILE, JSON.stringify(out, null, 4))
    })

program.command('create')
    .arguments('<outfile>')
    .action((outfile) => {

        const schema = loadSchema();

        const out : string[] = [];
        for (const key in schema) {
            const value = schema[key];
            if (value.comment) {
                out.push(`### ${value.comment}`)
            }
            out.push(`${key}=${value.default}\n`)
        }
        const formatted = out.join('\n');
        fs.writeFileSync(outfile, formatted);
    });


program.command('validate')
    .arguments('<envfile>')
    .action((envfile) => {
        const schema = loadSchema();
        const envContent = fs.readFileSync(envfile);
        const parsedEnv = parse(envContent);

        let anyFailures = false;
        for (const key in schema) {
            const config = schema[key];

            const isDefined = parsedEnv.hasOwnProperty(key)
            const currentValue = isDefined ? parsedEnv[key] : undefined;
            if (config.required) {
                if (!isDefined) {
                    console.warn(`${key} is required, but is not defined in ${envfile}`);
                    anyFailures = true;
                } else if (!currentValue) {
                    console.warn(`${key} is required, but has no value in ${envfile}`);
                    anyFailures = true;
                }
            }
        }
        if (anyFailures) {
            process.exitCode = 1;
        }
    });

program.command('sync')
    .arguments('<envfile>')
    .action((envfile) => {
        const schema = loadSchema();
        const envContent = fs.readFileSync(envfile);
        const parsedEnv = parse(envContent);

        const out: string[] = [];
        for (const key in schema) {
            const config = schema[key];

            const isDefined = parsedEnv.hasOwnProperty(key)
            const currentValue = isDefined ? parsedEnv[key] : undefined;


            if (config.comment) {
                out.push(`### ${config.comment}`)
            }

            if (isDefined) {
                out.push(`${key}=${currentValue}\n`);
            } else {
                out.push(`${key}=${config.default}\n`)
            }
        }
        const contents = out.join('\n');
        fs.writeFileSync(envfile, contents);
    });

program.parseAsync().then()