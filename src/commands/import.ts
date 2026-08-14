import fs from "fs";
import path from "path";
import process from "process";
import { execFileSync } from "child_process";
import { parse } from "dotenv";
import { buildImportedEnvContent, extractPublicKeyLines, getKeysToEncrypt, loadSchema } from "../lib";

export interface ImportOptions {
  output: string;
}

function readInput(inputFile?: string): string {
  // No file argument, or the conventional "-" for stdin
  if (!inputFile || inputFile === '-') {
    return fs.readFileSync(0, 'utf-8');
  }
  return fs.readFileSync(inputFile, 'utf-8');
}

export function importCommand(
  inputFile: string | undefined,
  options: ImportOptions,
  schemaFile: string
): void {
  const schema = loadSchema(schemaFile);
  const outputFile = options.output;

  let raw: string;
  try {
    raw = readInput(inputFile);
  } catch (error: any) {
    console.error(`Failed to read input: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const parsedEnv = parse(raw);
  const keys = Object.keys(parsedEnv);
  if (keys.length === 0) {
    console.warn('No environment variables found in input.');
    process.exitCode = 1;
    return;
  }

  const outputExisted = fs.existsSync(outputFile);
  // Preserve an existing dotenvx keypair so re-importing doesn't rotate it
  const existingPublicKeyLines = outputExisted
    ? extractPublicKeyLines(fs.readFileSync(outputFile, 'utf-8'))
    : [];

  const outputDir = path.dirname(outputFile);
  if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contents = buildImportedEnvContent(parsedEnv, existingPublicKeyLines);
  fs.writeFileSync(outputFile, contents);
  console.log(`${outputExisted ? 'Updated' : 'Created'} ${outputFile} with ${keys.length} imported value(s).`);

  const keysToEncrypt = getKeysToEncrypt(schema, keys);
  if (keysToEncrypt.length === 0) {
    console.log('No imported keys are marked "encrypted" in the schema; skipping encryption.');
    return;
  }

  // dotenvx bootstraps a public/private keypair automatically the first time
  // it encrypts a file that doesn't already have one (adding DOTENV_PUBLIC_KEY
  // to the output file and writing its private counterpart to a .env.keys file).
  try {
    const args = ['encrypt', '-f', outputFile];
    for (const key of keysToEncrypt) {
      args.push('-k', key);
    }
    execFileSync('dotenvx', args, { stdio: 'inherit' });
    console.log(`✅ Encrypted ${keysToEncrypt.length} value(s) in ${outputFile} using dotenvx.`);
  } catch (error) {
    console.error('Failed to encrypt values with dotenvx. Ensure @dotenvx/dotenvx is installed:\n  npm install @dotenvx/dotenvx');
    process.exitCode = 1;
  }
}
