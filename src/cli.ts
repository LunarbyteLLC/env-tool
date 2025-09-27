import { Command } from 'commander';
import { initCommand, InitOptions } from './commands/init';
import { auditCommand, AuditOptions } from './commands/audit';
import { validateCommand } from './commands/validate';
import { syncCommand } from './commands/sync';

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
        .option('--with-dotenvx', 'install and configure dotenvx for secrets management')
        .action((dir: string | undefined, options: InitOptions) => {
            initCommand(dir, options, DEFAULT_SCHEMA_FILE);
        })

    program.command('audit')
        .arguments('<dir>')
        .description('Audit project files for environment variables not in the schema')
        .option('--no-git', 'Disable Git tracking for file scanning')
        .action((dir: string, options: AuditOptions) => {
            auditCommand(dir, options, DEFAULT_SCHEMA_FILE);
        })

    program.command('validate')
        .arguments('<envfile>')
        .description('Validate an env file against the schema')
        .action((envfile: string) => {
            validateCommand(envfile, DEFAULT_SCHEMA_FILE);
        });

    program.command('sync')
        .arguments('<envfile>')
        .description('Sync an env file with the schema')
        .action((envfile: string) => {
            syncCommand(envfile, DEFAULT_SCHEMA_FILE);
        });

    return program;
}

