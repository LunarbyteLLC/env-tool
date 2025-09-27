import process from "process";
import { audit, loadSchema, scanVars } from "../lib";

export interface AuditOptions {
  git: boolean;
}

export function auditCommand(
  dir: string,
  options: AuditOptions,
  schemaFile: string
): void {
  const vars = scanVars(dir, options.git);
  const schema = loadSchema(schemaFile);
  const issues = audit(vars, schema);
  if (issues.length > 0) {
    console.warn(issues.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('No issues found. All environment variables are in the schema.');
  }
}
