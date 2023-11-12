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