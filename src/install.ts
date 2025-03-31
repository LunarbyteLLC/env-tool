import path from 'path';
import fs from 'fs';

export interface PackageJson {
    name?: string;
    scripts?: Record<string, string>;
    [key: string]: any;
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