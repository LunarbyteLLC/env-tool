import {Command} from 'commander';
import {audit, initSchema, loadSchema, scanVars, syncEnvFile, validate} from "./lib";
import process from "process";
import fs from "fs";
import {parse} from "dotenv";
import {updatePackageJson, detectSourceDirectory} from "./install";
import path from "path";

export function createCli() {

    const DEFAULT_SCHEMA_FILE = './envconfig.json';

    const program = new Command();
    
    program
        .name('env-tool')
        .description('A tool to manage environment variables in TypeScript/JavaScript projects')
        .version('1.0.4');

    program.command('init')
        .argument('[dir]', 'Source directory to scan (will auto-detect if not specified)')
        .description('Initialize env-tool in your project')
        .option('-f, --force', 'Overwrite existing schema file', false)
        .option('--no-git', 'Disable Git tracking for file scanning')
        .option('--no-scripts', 'Skip adding scripts to package.json')
        .action((dir, options) => {
            // Auto-detect source directory if not specified
            const sourceDir = dir ? (dir.endsWith('/') ? dir : `${dir}/`) : detectSourceDirectory();
            console.log(`Using source directory: ${sourceDir}`);

            // Update package.json with env-tool scripts if not disabled
            if (options.scripts) {
                const packageJsonPath = path.resolve(process.cwd(), 'package.json');
                if (!fs.existsSync(packageJsonPath)) {
                    console.error('No package.json found in the current directory.');
                    process.exitCode = 1;
                    return;
                }

                try {
                    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
                    const packageJson = JSON.parse(packageJsonContent);
                    const updatedPackageJson = updatePackageJson(packageJson, [sourceDir]);
                    fs.writeFileSync(
                        packageJsonPath,
                        JSON.stringify(updatedPackageJson, null, 2) + '\n'
                    );
                    console.log('✅ Added env-tool scripts to package.json');
                } catch (error) {
                    console.error('Failed to update package.json:', error);
                    process.exitCode = 1;
                    return;
                }
            }

            // Create or update schema file
            if (fs.existsSync(DEFAULT_SCHEMA_FILE) && !options.force) {
                process.exitCode = 1;
                console.warn(`${DEFAULT_SCHEMA_FILE} already exists. Use -f to overwrite if you want to start over.`)
                return;
            }

            const vars = scanVars(sourceDir, options.git);
            const out = initSchema(vars);
            fs.writeFileSync(DEFAULT_SCHEMA_FILE, JSON.stringify(out, null, 4))
            console.log(`✅ Created schema file at ${DEFAULT_SCHEMA_FILE}`);

            // Print next steps
            console.log(`
                        Getting Started:

                        1. Review and update the generated ${DEFAULT_SCHEMA_FILE} file:
                        - Set appropriate default values
                        - Add meaningful comments
                        - Set required flags according to your needs

                        2. Sync your .env file with the schema:
                        npm run env:sync

                        3. Validate your .env file:
                        npm run env:validate
                        `);
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

