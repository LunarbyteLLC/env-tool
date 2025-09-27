import fs from "fs";
import {parse} from "dotenv";
import {loadSchema, syncEnvFile} from "../lib";

export function syncCommand(envfile: string, schemaFile: string): void {
  const schema = loadSchema(schemaFile);

  let envContent: Buffer;
  try {
    envContent = fs.readFileSync(envfile);
    console.log(`Updating ${envfile} with schema values...`);
  } catch (e: any) {
    envContent = Buffer.from('');
    console.log(`Creating new ${envfile} from schema...`);
  }
  const parsedEnv = parse(envContent);
  const contents = syncEnvFile(schema, parsedEnv);
  fs.writeFileSync(envfile, contents);
  console.log(`${envfile} has been updated.`);
}
