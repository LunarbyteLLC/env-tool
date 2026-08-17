import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface EnvSchema {
    [key: string]: {
        comment?: string;
        required: boolean;
        default: string;
        encrypted?: boolean;
    }
}
export function scanVars(dir: string, useGit: boolean = true): string[] {
    const gitAvailable = useGit && isGitAvailable(dir);
    const vars = new Set<string>();
    
    // Common directories and files to ignore
    const ignorePatterns = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.next',
        '.cache',
        '.DS_Store'
    ];

    function shouldIgnore(pathName: string): boolean {
        const baseName = path.basename(pathName);
        return ignorePatterns.includes(baseName);
    }

    function traverseDir(dir: string) {
        fs.readdirSync(dir).forEach(file => {
            let fullPath = path.join(dir, file);
            
            if (fs.lstatSync(fullPath).isDirectory()) {
                // Skip ignored directories
                if (!shouldIgnore(fullPath)) {
                    traverseDir(fullPath);
                }
            } else {
                // Skip non-TypeScript/JavaScript files
                if (!/\.(ts|tsx|js|jsx)$/.test(fullPath)) {
                    return;
                }

                // If Git tracking is enabled and file is not tracked, skip it
                if (gitAvailable && isGitIgnored(fullPath, dir)) {
                    return;
                }
                
                const content = fs.readFileSync(fullPath).toString('utf-8');

                const matches = content.matchAll(/process\.env\.(\w+)/gm)
                for (const match of matches) {
                    vars.add(match[1])
                }
            }
        });
    }

    traverseDir(dir);

    return Array.from(vars);
}

/**
 * Load the environment schema from the specified path
 * @param path Path to the schema file
 * @returns The parsed schema
 */
export function loadSchema(path: string): EnvSchema {
    try {
        const contents = fs.readFileSync(path).toString('utf-8');
        const config = JSON.parse(contents);
        return config;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error(`Schema file not found: ${path}`);
            console.error(`Run 'env-tool init <directory>' to create a schema first.`);
        } else {
            console.error(`Error loading schema: ${error.message}`);
        }
        process.exit(1);
    }
}

export function audit(vars: string[], schema: EnvSchema) {
    const issues: string[] = [];
    for (const env of vars) {
        if (!schema[env]) {
            issues.push(`${env} is not defined in schema.`);
        }
    }
    return issues;
}

export function initSchema(vars: string[]) {
    const out: { [key: string]: any } = {};
    for (const env of vars) {
        out[env] = {
            required: true,
            default: '',
            comment: 'This var does something useful'
        }
    }
    return out;
}

export function generateEnvFile(schema: EnvSchema) {
    const out: string[] = [];
    for (const key in schema) {
        const value = schema[key];
        if (value.comment) {
            out.push(`### ${value.comment}`)
        }
        out.push(`${key}=${value.default}\n`)
    }
    const formatted = out.join('\n');
    return formatted;
}

export interface ValidationResult {
    key: string,
    error: 'not_defined' | 'no_value'
}[]

export function validate(schema: EnvSchema, envValues: any) {
    const issues: ValidationResult[] = [];
    for (const key in schema) {
        const config = schema[key];
        const isDefined = envValues.hasOwnProperty(key)
        const currentValue = isDefined ? envValues[key] : undefined;
        if (config.required) {
            if (!isDefined) {
                issues.push({ key, error: 'not_defined'})
            } else if (!currentValue) {
                issues.push({key, error: 'no_value'});
            }
        }
    }
    return issues;
}

export function syncEnvFile(schema: EnvSchema, currentValues: any) {
    const out: string[] = [];
    for (const key in schema) {
        const config = schema[key];

        const isDefined = currentValues.hasOwnProperty(key)
        const currentValue = isDefined ? currentValues[key] : undefined;


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
    return contents;
}

// Matches a dotenvx public key entry, e.g. DOTENV_PUBLIC_KEY or DOTENV_PUBLIC_KEY_PRODUCTION
const PUBLIC_KEY_PATTERN = /^DOTENV_PUBLIC_KEY(_[A-Z0-9_]+)?$/;

/**
 * Build the contents of an imported env file using the same comment/value
 * formatting as syncEnvFile, plus any values not documented in the schema
 * (e.g. vars removed from the schema) are preserved unchanged at the end of
 * the file. A dotenvx DOTENV_PUBLIC_KEY entry, if present, is always placed
 * first, matching dotenvx's own file layout.
 */
export function buildImportedEnvContent(schema: EnvSchema, values: Record<string, string>): string {
    const out: string[] = [];
    const undocumentedKeys = new Set(Object.keys(values));

    for (const key of undocumentedKeys) {
        if (PUBLIC_KEY_PATTERN.test(key)) {
            out.push(`${key}=${values[key]}\n`);
            undocumentedKeys.delete(key);
        }
    }

    for (const key in schema) {
        const config = schema[key];
        const isDefined = values.hasOwnProperty(key);
        const currentValue = isDefined ? values[key] : undefined;

        if (config.comment) {
            out.push(`### ${config.comment}`)
        }

        if (isDefined) {
            out.push(`${key}=${currentValue}\n`);
        } else {
            out.push(`${key}=${config.default}\n`)
        }
        undocumentedKeys.delete(key);
    }

    for (const key of undocumentedKeys) {
        out.push(`${key}=${values[key]}\n`);
    }

    const contents = out.join('\n');
    return contents;
}

/**
 * Determine which of the given keys are flagged for encryption in the schema.
 */
export function getKeysToEncrypt(schema: EnvSchema, keys: string[]): string[] {
    return keys.filter(key => schema[key]?.encrypted === true);
}

/**
 * Check if Git is available in the current directory
 */
export function isGitAvailable(dir: string): boolean {
    try {
        execSync('git rev-parse --is-inside-work-tree', {
            cwd: dir,
            stdio: 'ignore'
        });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Check if a file is ignored by Git
 * @param filePath Path to the file to check
 * @param dir Directory containing the Git repository
 * @returns true if the file is ignored by Git, false otherwise
 */
function isGitIgnored(filePath: string, dir: string): boolean {
    try {
        execSync(`git check-ignore "${filePath}"`, {
            cwd: dir,
            stdio: 'ignore'
        });
        return true;
    } catch (error) {
        // If the command fails (returns non-zero), the file is not ignored
        return false;
    }
}