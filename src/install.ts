#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface PackageJson {
    name?: string;
    scripts?: Record<string, string>;
    [key: string]: any;
}

/**
 * Display help information
 */
function showHelp() {
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
 * Detects the most likely source directory in the project
 * @returns The detected source directory path
 */
function detectSourceDirectory(): string {
    const possibleSrcDirs = ['src', 'app', 'lib', 'source'];
    
    for (const dir of possibleSrcDirs) {
        if (fs.existsSync(path.resolve(process.cwd(), dir))) {
            return `${dir}/`;
        }
    }
    
    // Default to current directory if no standard directory is found
    return './';
}

/**
 * Updates a project's package.json with env-tool scripts
 * @param sourceDir The directory to target for env-tool operations
 */
function updatePackageJson(sourceDir: string) {
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
    
    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    
    // Add env-tool scripts with the specified source directory
    const scripts = {
        'env-tool': 'env-tool',
        'env:init': `env-tool init ${sourceDir}`,
        'env:audit': `env-tool audit ${sourceDir}`,
        'env:validate': 'env-tool validate .env',
        'env:sync': 'env-tool sync .env'
    };
    
    // Merge scripts with existing ones
    Object.entries(scripts).forEach(([key, value]) => {
        if (!packageJson.scripts![key]) {
            packageJson.scripts![key] = value;
        }
    });
    
    // Write updated package.json
    fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n'
    );
    
    console.log('✅ Added env-tool scripts to package.json');
    
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
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
} else {
    // Check for directory flag
    let sourceDir = '';
    const dirIndex = args.findIndex(arg => arg === '--dir' || arg === '-d');
    
    if (dirIndex !== -1 && args.length > dirIndex + 1) {
        sourceDir = args[dirIndex + 1];
        // Ensure directory ends with a slash
        if (!sourceDir.endsWith('/')) {
            sourceDir += '/';
        }
        console.log(`Using specified source directory: ${sourceDir}`);
    } else {
        sourceDir = detectSourceDirectory();
        console.log(`Auto-detected source directory: ${sourceDir}`);
    }
    
    // Run the installation with the specified or detected source directory
    updatePackageJson(sourceDir);
} 