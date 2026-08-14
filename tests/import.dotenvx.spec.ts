import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { createCli } from '../src/cli';
import { parse } from 'dotenv';

/**
 * E2E-style tests for `env-tool import`.
 * Uses a real temporary directory and the real dotenvx binary (a devDependency)
 * to verify that flagged keys are actually encrypted and unflagged keys are not.
 */
describe('env-tool import (e2e-ish)', () => {
  const originalCwd = process.cwd();
  let tmpDir: string;
  let program: Command;

  beforeEach(() => {
    process.exitCode = 0;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-tool-import-'));
    process.chdir(tmpDir);

    fs.writeFileSync(
      path.join(tmpDir, 'envconfig.json'),
      JSON.stringify({
        SECRET: { required: true, default: '', comment: 'secret', encrypted: true },
        PLAIN: { required: true, default: '', comment: 'plain' },
      }, null, 2)
    );

    program = createCli();
  });

  afterEach(() => {
    process.exitCode = 0;
    try {
      process.chdir(originalCwd);
    } catch {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    jest.restoreAllMocks();
  });

  it('encrypts only keys flagged "encrypted" in the schema and bootstraps a keypair', async () => {
    fs.writeFileSync(path.join(tmpDir, 'input.env'), 'SECRET=topsecret\nPLAIN=hello\n');

    await program.parseAsync(['node', 'env-tool', 'import', 'input.env', '-o', '.env']);

    expect(process.exitCode).toEqual(0);

    const outContent = fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8');
    const parsedOut = parse(outContent);

    // PLAIN should be untouched
    expect(parsedOut.PLAIN).toEqual('hello');
    // SECRET should be encrypted, not the raw value
    expect(parsedOut.SECRET).toMatch(/^encrypted:/);
    expect(parsedOut.SECRET).not.toEqual('topsecret');
    // A public key should have been bootstrapped into the output file
    expect(outContent).toMatch(/DOTENV_PUBLIC_KEY="[0-9a-f]+"/);

    // dotenvx should have written a .env.keys file with the private key
    const keysPath = path.join(tmpDir, '.env.keys');
    expect(fs.existsSync(keysPath)).toBe(true);
    expect(fs.readFileSync(keysPath, 'utf-8')).toMatch(/DOTENV_PRIVATE_KEY=[0-9a-f]+/);
  });

  it('reads from stdin when no input file argument is given', async () => {
    const stdinContent = 'PLAIN=from_stdin\n';
    const realReadFileSync = fs.readFileSync.bind(fs);
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath: any, ...rest: any[]) => {
      if (filePath === 0) {
        return stdinContent as any;
      }
      return (realReadFileSync as any)(filePath, ...rest);
    });

    await program.parseAsync(['node', 'env-tool', 'import', '-o', '.env']);

    expect(process.exitCode).toEqual(0);
    const outContent = fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8');
    expect(parse(outContent).PLAIN).toEqual('from_stdin');
  });

  it('does not invoke dotenvx when no imported keys are flagged as encrypted', async () => {
    fs.writeFileSync(path.join(tmpDir, 'input.env'), 'PLAIN=hello\n');

    await program.parseAsync(['node', 'env-tool', 'import', 'input.env', '-o', '.env']);

    expect(process.exitCode).toEqual(0);
    const outContent = fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8');
    expect(parse(outContent).PLAIN).toEqual('hello');
    expect(fs.existsSync(path.join(tmpDir, '.env.keys'))).toBe(false);
  });

  it('reuses an existing keypair instead of rotating it on re-import', async () => {
    fs.writeFileSync(path.join(tmpDir, 'input.env'), 'SECRET=first\nPLAIN=hello\n');
    await program.parseAsync(['node', 'env-tool', 'import', 'input.env', '-o', '.env']);

    const keysPath = path.join(tmpDir, '.env.keys');
    const privateKeyAfterFirstImport = fs.readFileSync(keysPath, 'utf-8');
    const publicKeyAfterFirstImport = parse(fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8')).DOTENV_PUBLIC_KEY;

    fs.writeFileSync(path.join(tmpDir, 'input.env'), 'SECRET=second\nPLAIN=world\n');
    await program.parseAsync(['node', 'env-tool', 'import', 'input.env', '-o', '.env']);

    const privateKeyAfterSecondImport = fs.readFileSync(keysPath, 'utf-8');
    const parsedSecond = parse(fs.readFileSync(path.join(tmpDir, '.env'), 'utf-8'));

    expect(privateKeyAfterSecondImport).toEqual(privateKeyAfterFirstImport);
    expect(parsedSecond.DOTENV_PUBLIC_KEY).toEqual(publicKeyAfterFirstImport);
    expect(parsedSecond.PLAIN).toEqual('world');
  });

  it('errors out when the input file does not exist', async () => {
    const consoleError = console.error;
    console.error = jest.fn();
    try {
      await program.parseAsync(['node', 'env-tool', 'import', 'does-not-exist.env', '-o', '.env']);
      expect(process.exitCode).toEqual(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to read input'));
    } finally {
      console.error = consoleError;
    }
  });
});
