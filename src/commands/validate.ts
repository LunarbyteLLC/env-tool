import fs from "fs";
import process from "process";
import { parse } from "dotenv";
import { loadSchema, validate } from "../lib";

export function validateCommand(envfile: string, schemaFile: string): void {
  const schema = loadSchema(schemaFile);
  const envContent = fs.readFileSync(envfile);
  const parsedEnv = parse(envContent);
  const issues = validate(schema, parsedEnv);
  if (issues.length > 0) {
    const issueLabels: Record<string, string> = {
      no_value: 'has no value',
      not_defined: 'is not defined',
    };
    process.exitCode = 1;
    console.warn(
      issues.map(iss => `${iss.key} ${issueLabels[iss.error]} in ${envfile}`).join('\n')
    );
  } else {
    console.log(`${envfile} is valid.`);
  }
}
