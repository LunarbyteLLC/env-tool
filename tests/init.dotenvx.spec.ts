import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { createCli } from '../src/cli';
import * as child_process from 'child_process';

// Mock child_process.execSync only for npm install; allow real commands (including dotenvx) to run
jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  const execMock = jest.fn((command: any, options?: any) => {
    const cmd = String(command);
    if (cmd.includes('npm install @dotenvx/dotenvx')) {
      // Succeed for npm install without hitting the network
      return Buffer.from('');
    }
    // Defer to the real execSync for everything else (e.g., dotenvx)
    return (actual as any).execSync(command, options);
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

    (child_process.execSync as unknown as jest.Mock).mockClear();

    program = createCli();
  });

  afterEach(() => {
    try {
      process.chdir(originalCwd);
    } catch {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('installs dotenvx, scaffolds env dirs, syncs env files, initializes keys, and updates gitignore', async () => {
    await program.parseAsync(['node', 'env-tool', 'init', 'src', '--with-dotenvx']);

    // Assert we attempted to install dotenvx
    const execMock = child_process.execSync as unknown as jest.Mock;
    expect(execMock).toHaveBeenCalled();
    const installCall = execMock.mock.calls.find((c: any[]) => String(c[0]).includes('npm install @dotenvx/dotenvx'));
    expect(installCall).toBeTruthy();

    // Assert we attempted to initialize dotenvx keys for both envs
    const setCalls = execMock.mock.calls.filter((c: any[]) => String(c[0]).includes('dotenvx set'));
    expect(setCalls.length).toBeGreaterThanOrEqual(2);

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

    // .env.keys files should be created by dotenvx
    const devKeys = path.join(tmpDir, 'env', 'dev', '.env.keys');
    const prodKeys = path.join(tmpDir, 'env', 'prod', '.env.keys');
    expect(fs.existsSync(devKeys)).toBe(true);
    expect(fs.existsSync(prodKeys)).toBe(true);

    // Root .gitignore should include ignore rule for .env.keys
    const gitignorePath = path.join(tmpDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const gi = fs.readFileSync(gitignorePath, 'utf8');
    expect(gi.split(/\r?\n/)).toContain('**/.env.keys');
  });
});
