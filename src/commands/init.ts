import fs from "fs";
import path from "path";
import process from "process";
import { initSchema, scanVars } from "../lib";
import { detectSourceDirectory, updatePackageJson } from "../install";

export interface InitOptions {
  force: boolean;
  git: boolean;
  scripts: boolean;
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
