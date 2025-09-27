import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { createCli } from '../src/cli';
import * as child_process from 'child_process';

// Mock child_process.execSync to avoid a real npm install and make it observable
jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  const execMock = jest.fn((command: any) => {
    const cmd = String(command);
    if (cmd.includes('npm install @dotenvx/dotenvx')) {
      // Succeed for npm install
      return Buffer.from('');
    }
    // Fail for other commands (e.g., git) to simulate non-git repo
    const err: any = new Error('execSync mock: command failed');
    err.code = 1;
    throw err;
  });
  return {
    ...actual,
    execSync: execMock,
  } as typeof actual & { execSync: jest.Mock };
});

/**
 * E2E-style test for `env-tool init --with-dotenvx`.
 * - Avoids running real npm install by mocking execSync.
 * - Uses a real temporary directory and filesystem to verify results end-to-end.
 */
describe('env-tool init --with-dotenvx (e2e-ish)', () => {
  const originalCwd = process.cwd();
  let tmpDir: string;
  let program: Command;

  beforeEach(() => {
    // Create a fresh temp project directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-tool-dotenvx-'));
    process.chdir(tmpDir);

    // Set up a minimal project with package.json and src files
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'tmp-project', version: '1.0.0' }, null, 2)
    );

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    // Reference a couple of env vars so init can discover them
    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      [
        'export const a = process.env.TEST_ENV_VAR;',
        'export const b = process.env.TEST_VAR_2;',
      ].join('\n')
    );

    // Reset calls on mocked execSync before each test
    (child_process.execSync as unknown as jest.Mock).mockClear();

    program = createCli();
  });

  afterEach(() => {
    // Cleanup and restore
    try {
      process.chdir(originalCwd);
    } catch {}
    try {
      // Recursively delete the temp directory
      // Node 14+ supports recursive rm
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('installs dotenvx, scaffolds env dirs, and syncs env files based on schema', async () => {
    await program.parseAsync(['node', 'env-tool', 'init', 'src', '--with-dotenvx']);

    // Assert we attempted to install dotenvx
    const execMock = child_process.execSync as unknown as jest.Mock;
    expect(execMock).toHaveBeenCalled();
    const installCall = execMock.mock.calls.find((c: any[]) => String(c[0]).includes('npm install @dotenvx/dotenvx'));
    expect(installCall).toBeTruthy();

    // Schema file created
    const schemaPath = path.join(tmpDir, 'envconfig.json');
    expect(fs.existsSync(schemaPath)).toBe(true);

    // Env directories and files created
    const devEnv = path.join(tmpDir, 'env', 'dev', '.env');
    const prodEnv = path.join(tmpDir, 'env', 'prod', '.env');
    expect(fs.existsSync(devEnv)).toBe(true);
    expect(fs.existsSync(prodEnv)).toBe(true);

    // Both env files should contain the discovered keys
    const devContents = fs.readFileSync(devEnv, 'utf8');
    const prodContents = fs.readFileSync(prodEnv, 'utf8');
    expect(devContents).toContain('TEST_ENV_VAR=');
    expect(devContents).toContain('TEST_VAR_2=');
    expect(prodContents).toContain('TEST_ENV_VAR=');
    expect(prodContents).toContain('TEST_VAR_2=');
  });
});
