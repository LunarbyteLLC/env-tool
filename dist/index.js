"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const process_1 = __importDefault(require("process"));
const program = new commander_1.Command();
const DEFAULT_SCHEMA_FILE = './envconfig.json';
function scanVars(dir) {
    const envVars = new Set();
    function traverseDir(dir) {
        fs_1.default.readdirSync(dir).forEach(file => {
            let fullPath = path_1.default.join(dir, file);
            if (fs_1.default.lstatSync(fullPath).isDirectory()) {
                traverseDir(fullPath);
            }
            else {
                const content = fs_1.default.readFileSync(fullPath).toString('utf-8');
                const matches = content.matchAll(/process\.env\.(\w+)/gm);
                for (const match of matches) {
                    envVars.add(match[1]);
                }
            }
        });
    }
    traverseDir(dir);
    return envVars;
}
function loadSchema() {
    const contents = fs_1.default.readFileSync(DEFAULT_SCHEMA_FILE).toString('utf-8');
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
});
program.command('init')
    .arguments('<dir>')
    .option('-f --force', 'Overwrite existing schema file', false)
    .action((dir, options) => {
    if (fs_1.default.existsSync(DEFAULT_SCHEMA_FILE) && !options.force) {
        console.error(`${DEFAULT_SCHEMA_FILE} already exists. Use -f to overwrite if you want to start over.`);
        process_1.default.exitCode = 1;
        return;
    }
    const vars = scanVars(dir);
    const out = {};
    for (const env of vars) {
        out[env] = {
            required: true,
            default: '',
            comment: 'This var does something useful'
        };
    }
    fs_1.default.writeFileSync(DEFAULT_SCHEMA_FILE, JSON.stringify(out, null, 4));
});
program.command('create')
    .arguments('<outfile>')
    .action((outfile) => {
    const schema = loadSchema();
    const out = [];
    for (const key in schema) {
        const value = schema[key];
        if (value.comment) {
            out.push(`### ${value.comment}`);
        }
        out.push(`${key}=${value.default}\n`);
    }
    const formatted = out.join('\n');
    fs_1.default.writeFileSync(outfile, formatted);
});
program.command('validate')
    .arguments('<envfile>')
    .action((envfile) => {
    const schema = loadSchema();
    const envContent = fs_1.default.readFileSync(envfile);
    const parsedEnv = (0, dotenv_1.parse)(envContent);
    let anyFailures = false;
    for (const key in schema) {
        const config = schema[key];
        const isDefined = parsedEnv.hasOwnProperty(key);
        const currentValue = isDefined ? parsedEnv[key] : undefined;
        if (config.required) {
            if (!isDefined) {
                console.warn(`${key} is required, but is not defined in ${envfile}`);
                anyFailures = true;
            }
            else if (!currentValue) {
                console.warn(`${key} is required, but has no value in ${envfile}`);
                anyFailures = true;
            }
        }
    }
    if (anyFailures) {
        process_1.default.exitCode = 1;
    }
});
program.command('sync')
    .arguments('<envfile>')
    .action((envfile) => {
    const schema = loadSchema();
    const envContent = fs_1.default.readFileSync(envfile);
    const parsedEnv = (0, dotenv_1.parse)(envContent);
    const out = [];
    for (const key in schema) {
        const config = schema[key];
        const isDefined = parsedEnv.hasOwnProperty(key);
        const currentValue = isDefined ? parsedEnv[key] : undefined;
        if (config.comment) {
            out.push(`### ${config.comment}`);
        }
        if (isDefined) {
            out.push(`${key}=${currentValue}\n`);
        }
        else {
            out.push(`${key}=${config.default}\n`);
        }
    }
    const contents = out.join('\n');
    fs_1.default.writeFileSync(envfile, contents);
});
program.parseAsync().then();
