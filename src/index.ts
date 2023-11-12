#!/usr/bin/env node

import {Command} from 'commander';
import fs from "fs";
import {parse} from "dotenv"
import process from "process";
import {audit, initSchema, loadSchema, scanVars} from "./lib";

const program = new Command();

const DEFAULT_SCHEMA_FILE = './envconfig.json';

program.command('audit')
    .arguments('<dir>')
    .action((dir) => {

        const vars = scanVars(dir);
        const schema = loadSchema();

        const issues = audit(vars, schema);

        if (issues.length > 0) {
            console.log(issues.join('\n'));
            process.exitCode = 1;
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

        const out = initSchema(vars);
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

        const issues: string[] = [];
        for (const key in schema) {
            const config = schema[key];

            const isDefined = parsedEnv.hasOwnProperty(key)
            const currentValue = isDefined ? parsedEnv[key] : undefined;
            if (config.required) {
                if (!isDefined) {
                    issues.push(`${key} is required, but is not defined in ${envfile}`)
                } else if (!currentValue) {
                    issues.push(`${key} is required, but has no value in ${envfile}`);
                }
            }
        }
        if (issues.length > 0) {
            console.warn(issues.join('\n'))
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