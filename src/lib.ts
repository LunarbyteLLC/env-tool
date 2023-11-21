import fs from "fs";
import path from "path";

export interface EnvSchema {
    [key: string]: {
        comment?: string;
        required: boolean;
        default: string;
    }
}
export function scanVars(dir: string) {
    const envVars = new Set<string>();

    function traverseDir(dir: string) {
        fs.readdirSync(dir).forEach(file => {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                traverseDir(fullPath);
            } else {
                const content = fs.readFileSync(fullPath).toString('utf-8');

                const matches = content.matchAll(/process\.env\.(\w+)/gm)
                for (const match of matches) {
                    envVars.add(match[1])
                }
            }
        });
    }

    traverseDir(dir);

    return Array.from(envVars);
}

export function loadSchema(path: string): EnvSchema {
    const contents = fs.readFileSync(path).toString('utf-8');
    const config = JSON.parse(contents);
    return config;
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