#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

interface PackageJson {
    name?: string;
    scripts?: Record<string, string>;
    [key: string]: any;
}

/**
 * Display help information
 */
export function showHelp() {
    console.log(`
env-tool-init

A helper script to set up env-tool in your project.

Usage:
  npx env-tool-init [options]

Options:
  --help, -h     Show this help message
  --dir, -d      Specify source directory to scan (default: auto-detected)

This script will:
1. Add env-tool scripts to your package.json
2. Detect your source directory (or use the one you specified)
3. Provide instructions to get started
`);
    process.exit(0);
}

/**
 * Find potential source directories in the project
 * @returns Array of detected source directories
 */
export function findSourceDirs(): string[] {
    const possibleSrcDirs = ['src', 'app', 'lib', 'source'];
    const foundDirs: string[] = [];
    
    for (const dir of possibleSrcDirs) {
        if (fs.existsSync(path.resolve(process.cwd(), dir))) {
            foundDirs.push(dir);
        }
    }
    
    return foundDirs.length > 0 ? foundDirs : ['./'];
}

/**
 * Detects the most likely source directory in the project
 * @returns The detected source directory path
 */
export function detectSourceDirectory(): string {
    const dirs = findSourceDirs();
    const sourceDir = dirs[0];
    return sourceDir.endsWith('/') ? sourceDir : `${sourceDir}/`;
}

/**
 * Updates a package.json object with env-tool scripts
 * @param packageJson The package.json object to update
 * @param sourceDirs Array of source directories to target
 * @returns The updated package.json object
 */
export function updatePackageJson(packageJson: PackageJson, sourceDirs: string[]): PackageJson {
    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    
    const sourceDir = sourceDirs[0];
    const formattedSourceDir = sourceDir.endsWith('/') ? sourceDir : `${sourceDir}/`;
    
    // Add env-tool scripts with the specified source directory
    const scripts = {
        'env-tool': 'env-tool',
        'env:init': `env-tool init ${formattedSourceDir}`,
        'env:audit': `env-tool audit ${formattedSourceDir}`,
        'env:validate': 'env-tool validate .env',
        'env:sync': 'env-tool sync .env'
    };
    
    // Merge scripts with existing ones
    Object.entries(scripts).forEach(([key, value]) => {
        if (!packageJson.scripts![key]) {
            packageJson.scripts![key] = value;
        }
    });
    
    return packageJson;
}

/**
 * Updates the project's package.json file with env-tool scripts
 * @param sourceDir The directory to target for env-tool operations
 */
export function updatePackageJsonFile(sourceDir: string) {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        console.error('No package.json found in the current directory.');
        process.exit(1);
    }
    
    let packageJson: PackageJson;
    try {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageJsonContent);
    } catch (error) {
        console.error('Failed to parse package.json:', error);
        process.exit(1);
    }
    
    const updatedPackageJson = updatePackageJson(packageJson, [sourceDir]);
    
    // Write updated package.json
    fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(updatedPackageJson, null, 2) + '\n'
    );
    
    console.log('✅ Added env-tool scripts to package.json');
}

/**
 * Creates an initial empty schema file in the project
 */
export function createInitialSchema() {
    const schemaPath = path.resolve(process.cwd(), 'envconfig.json');
    
    // Create an empty schema file
    fs.writeFileSync(
        schemaPath,
        JSON.stringify({}, null, 2) + '\n'
    );
    
    console.log('✅ Created initial envconfig.json schema file');
}

/**
 * Runs the installation process with an optional specified source directory
 * @param specifiedSourceDir Optional source directory to use
 */
export function runInstallation(specifiedSourceDir?: string) {
    let sourceDir: string;
    
    if (specifiedSourceDir) {
        sourceDir = specifiedSourceDir;
        if (!sourceDir.endsWith('/')) {
            sourceDir += '/';
        }
        console.log(`Using specified source directory: ${sourceDir}`);
    } else {
        sourceDir = detectSourceDirectory();
        console.log(`Auto-detected source directory: ${sourceDir}`);
    }
    
    // Update package.json with env-tool scripts
    updatePackageJsonFile(sourceDir);
    
    // Create initial schema file
    createInitialSchema();
    
    console.log(`
Installation complete! Here's how to get started:

1. Initialize the env schema:
   npm run env:init

2. Review and update the generated envconfig.json file

3. Sync your .env file with the schema:
   npm run env:sync

Note: Your source code directory is set to "${sourceDir}".
If you need to change this, you can update the "env:init" and "env:audit"
scripts in package.json.
`);
}

// Process command-line arguments
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
    } else {
        // Check for directory flag
        let sourceDir = '';
        const dirIndex = args.findIndex(arg => arg === '--dir' || arg === '-d');
        
        if (dirIndex !== -1 && args.length > dirIndex + 1) {
            sourceDir = args[dirIndex + 1];
            runInstallation(sourceDir);
        } else {
            runInstallation();
        }
    }
} 