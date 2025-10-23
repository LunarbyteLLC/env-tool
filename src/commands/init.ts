import fs from "fs";
import path from "path";
import process from "process";
import { execSync } from "child_process";
import { initSchema, scanVars } from "../lib";
import { detectSourceDirectory, updatePackageJson } from "../install";
import { syncCommand } from "./sync";

export interface InitOptions {
  force: boolean;
  git: boolean;
  scripts: boolean;
  withDotenvx?: boolean;
}

// Kept here in case future reuse is needed
const DEFAULT_SOURCE_DIR_DETECTOR = detectSourceDirectory;

export function initCommand(
  dir: string | undefined,
  options: InitOptions,
  schemaFile: string
): void {
  // Auto-detect source directory if not specified
  const sourceDir = dir ? (dir.endsWith('/') ? dir : `${dir}/`) : DEFAULT_SOURCE_DIR_DETECTOR();
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
  if (fs.existsSync(schemaFile) && !options.force) {
    process.exitCode = 1;
    console.warn(`${schemaFile} already exists. Use -f to overwrite if you want to start over.`);
    return;
  }

  const vars = scanVars(sourceDir, options.git);
  const out = initSchema(vars);
  fs.writeFileSync(schemaFile, JSON.stringify(out, null, 4));
  console.log(`✅ Created schema file at ${schemaFile}`);

  // Optional: install and set up dotenvx environments
  if (options.withDotenvx) {
    try {
      console.log('Installing @dotenvx/dotenvx...');
      execSync('npm install @dotenvx/dotenvx', { stdio: 'inherit' });
      console.log('✅ Installed @dotenvx/dotenvx');
    } catch (e) {
      console.warn('⚠️ Failed to install @dotenvx/dotenvx. You can install it manually with:\n  npm install @dotenvx/dotenvx');
    }

    const envRoot = path.resolve(process.cwd(), 'env');
    const envs = ['dev', 'prod'] as const;

    // Create env directories, ensure .env files, sync based on schema, and initialize dotenvx keys
    for (const name of envs) {
      const dirPath = path.join(envRoot, name);
      fs.mkdirSync(dirPath, { recursive: true });
      const envFile = path.join(dirPath, '.env');
      if (!fs.existsSync(envFile)) fs.writeFileSync(envFile, '');
      // Populate file according to schema
      syncCommand(envFile, schemaFile);
      try {
      // Initialize dotenvx key by setting a dummy encrypted value
        execSync('dotenvx set HELLO world', { stdio: 'ignore', cwd: dirPath });
      } catch (e) {
        console.warn(`⚠️ Failed to initialize dotenvx key file in ${dirPath}. You can do it manually with:\n  (cd ${path.relative(process.cwd(), dirPath)} && dotenvx set HELLO world)`);
        process.exitCode = process.exitCode ?? 0; // do not exit, continue setup
      }
    }
    console.log('✅ Initialized dotenvx key files in env/dev and env/prod');

    try {
      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      const ignoreLine = '**/.env.keys';
      let current = '';
      if (fs.existsSync(gitignorePath)) {
        current = fs.readFileSync(gitignorePath, 'utf-8');
      }
      if (!current.split(/\r?\n/).includes(ignoreLine)) {
        const prefix = current && !current.endsWith('\n') ? '\n' : '';
        fs.writeFileSync(gitignorePath, current + prefix + ignoreLine + '\n');
        console.log('✅ Updated .gitignore to ignore **/.env.keys');
      }
    } catch (e) {
      console.warn('⚠️ Could not update .gitignore to ignore **/.env.keys');
      process.exitCode = process.exitCode ?? 0; // non-fatal
    }

    console.log('✅ Created env/dev/.env and env/prod/.env and synced keys from schema');
  }

  // Print next steps
  console.log(`
                        Getting Started:

                        1. Review and update the generated ${schemaFile} file:
                        - Set appropriate default values
                        - Add meaningful comments
                        - Set required flags according to your needs

                        2. Sync your .env file with the schema:
                        npm run env:sync

                        3. Validate your .env file:
                        npm run env:validate
                        `);
}
