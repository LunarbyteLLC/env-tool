import {createCli} from "../src/cli";
import fs from "fs";
import {Command} from "commander";

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn(() => []),
    lstatSync: jest.fn(() => ({
        isDirectory: () => false
    }))
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number): never => {
    throw new Error(`Process.exit(${code})`);
});

describe('env-tool cli', function () {
    const rootDir = process.cwd();
    let program: Command;
    const consoleWarn = console.warn;
    const consoleError = console.error;
    
    beforeEach(() => {
        process.exitCode = 0;
        process.chdir(rootDir);
        program = createCli();
        console.warn = jest.fn();
        console.error = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.exitCode = 0;
        process.chdir(rootDir);
        console.warn = consoleWarn;
        console.error = consoleError;
    });

    describe('init', function () {
        beforeEach(() => {
            // Mock file system operations
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return path.includes('package.json');
            });
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('package.json')) {
                    return JSON.stringify({
                        name: "test-app",
                        version: "1.0.0",
                        scripts: {
                            test: "echo \"Error: no test specified\" && exit 1"
                        }
                    });
                }
                return "";
            });
        });

        it('should init env from existing code and update package.json', async function () {
            process.chdir('tests/fixtures/init');
            await program.parseAsync(['node', 'env-tool', 'init', 'src']);
            
            // Check if package.json was updated
            expect(fs.writeFileSync).toHaveBeenCalled();
            const packageJsonCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('package.json')
            );
            expect(packageJsonCall).toBeTruthy();
            const packageJsonContent = JSON.parse(packageJsonCall[1]);
            expect(packageJsonContent.scripts['env:init']).toBe('env-tool init src/');
            
            // Check if schema file was created
            const schemaCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('envconfig.json')
            );
            expect(schemaCall).toBeTruthy();
        });

        it('should skip package.json update with --no-scripts', async function () {
            process.chdir('tests/fixtures/init');
            await program.parseAsync(['node', 'env-tool', 'init', 'src', '--no-scripts']);
            
            // Check that package.json was not updated
            const packageJsonCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('package.json')
            );
            expect(packageJsonCall).toBeFalsy();
            
            // But schema file should still be created
            const schemaCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('envconfig.json')
            );
            expect(schemaCall).toBeTruthy();
        });

        it('should error if existing schema with --force option', async function () {
            process.chdir('tests/fixtures/init-force');
            (fs.existsSync as jest.Mock).mockImplementation((path) => true);
            await program.parseAsync(['node', 'env-tool', 'init', 'src']);

            expect(process.exitCode).toEqual(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        });

        it('should overwrite existing schema using --force', async function () {
            process.chdir('tests/fixtures/init-force-override');
            (fs.existsSync as jest.Mock).mockImplementation((path) => true);
            await program.parseAsync(['node', 'env-tool', 'init', 'src', '--force']);

            const schemaCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('envconfig.json')
            );
            expect(schemaCall).toBeTruthy();
        });

        it('should handle missing package.json when scripts enabled', async function () {
            process.chdir('tests/fixtures/init');
            (fs.existsSync as jest.Mock).mockImplementation((path) => false);
            await program.parseAsync(['node', 'env-tool', 'init', 'src']);

            expect(process.exitCode).toEqual(1);
            expect(console.error).toHaveBeenCalledWith('No package.json found in the current directory.');
        });
    });

    describe('audit', function () {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('envconfig.json')) {
                    return JSON.stringify({
                        TEST_VAR: {
                            required: true,
                            default: '',
                            comment: 'Test variable'
                        }
                    });
                }
                if (path.includes('test.js')) {
                    return 'const value = process.env.UNDOCUMENTED_VAR;';
                }
                return "";
            });
            (fs.readdirSync as jest.Mock).mockImplementation((dir) => {
                if (dir.includes('src-bad')) {
                    return ['test.js'];
                }
                return [];
            });
            (fs.lstatSync as jest.Mock).mockReturnValue({
                isDirectory: () => false
            });
        });

        it('should exit 0 if no undocumented vars are found', async function () {
            process.chdir('tests/fixtures/audit');
            await program.parseAsync(['node', 'env-tool', 'audit', 'src-good']);
            expect(process.exitCode).toEqual(0);
        });

        it('should exit with error if undocumented vars are found', async function () {
            process.chdir('tests/fixtures/audit');
            await program.parseAsync(['node', 'env-tool', 'audit', 'src-bad']);
            expect(process.exitCode).toEqual(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('is not defined'));
        });
    });

    describe('validate', function () {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('envconfig.json')) {
                    return JSON.stringify({
                        TEST_VAR: {
                            required: true,
                            default: '',
                            comment: 'Test variable'
                        }
                    });
                }
                return "";
            });
        });

        it('should exit with error if env file has missing required vars', async function () {
            process.chdir('tests/fixtures/validate');
            await program.parseAsync(['node', 'env-tool', 'validate', 'missing-vars.env']);
            expect(process.exitCode).toEqual(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('is not defined'));
        });

        it('should exit with error if required vars have no value', async function () {
            process.chdir('tests/fixtures/validate');
            await program.parseAsync(['node', 'env-tool', 'validate', 'undefined-vars.env']);
            expect(process.exitCode).toEqual(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('is not defined'));
        });

        it('should exit 0 if env file matches schema', async function () {
            process.chdir('tests/fixtures/validate');
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('envconfig.json')) {
                    return JSON.stringify({
                        TEST_VAR: {
                            required: true,
                            default: 'test',
                            comment: 'Test variable'
                        }
                    });
                }
                if (path.includes('.env')) {
                    return 'TEST_VAR=test';
                }
                return "";
            });
            await program.parseAsync(['node', 'env-tool', 'validate', 'good.env']);
            expect(process.exitCode).toEqual(0);
        });
    });

    describe('sync', function () {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('envconfig.json')) {
                    return JSON.stringify({
                        TEST_ENV_VAR: {
                            required: true,
                            default: 'default_value',
                            comment: 'Test variable'
                        },
                        TEST_VAR_2: {
                            required: true,
                            default: 'default_value',
                            comment: 'Test variable 2'
                        }
                    });
                }
                return "";
            });
        });

        it('should output an env file based on the schema', async function () {
            process.chdir('tests/fixtures/sync');
            await program.parseAsync(['node', 'env-tool', 'sync', 'out.env']);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const envCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('out.env')
            );
            expect(envCall).toBeTruthy();
            expect(envCall[1]).toContain('TEST_ENV_VAR=default_value');
        });

        it('should update an env if one already exists', async function () {
            process.chdir('tests/fixtures/sync');
            (fs.readFileSync as jest.Mock).mockImplementation((path) => {
                if (path.includes('envconfig.json')) {
                    return JSON.stringify({
                        TEST_ENV_VAR: {
                            required: true,
                            default: 'default_value',
                            comment: 'Test variable'
                        },
                        TEST_VAR_2: {
                            required: true,
                            default: 'default_value',
                            comment: 'Test variable 2'
                        }
                    });
                }
                if (path.includes('.env')) {
                    return 'TEST_ENV_VAR=not_default_value';
                }
                return "";
            });
            await program.parseAsync(['node', 'env-tool', 'sync', 'out.env']);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const envCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('out.env')
            );
            expect(envCall).toBeTruthy();
            expect(envCall[1]).toContain('TEST_ENV_VAR=not_default_value');
            expect(envCall[1]).toContain('TEST_VAR_2=default_value');
        });
    });

    describe('import', function () {
        beforeEach(() => {
            (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
                if (String(filePath).includes('envconfig.json')) {
                    return JSON.stringify({
                        SECRET: {
                            required: true,
                            default: '',
                            comment: 'A secret value',
                            encrypted: true
                        },
                        PLAIN: {
                            required: true,
                            default: '',
                            comment: 'A plain value'
                        }
                    });
                }
                if (String(filePath).includes('input.env')) {
                    return 'PLAIN=hello\n';
                }
                return "";
            });
            (fs.existsSync as jest.Mock).mockImplementation(() => false);
        });

        it('should error when the --output option is missing', async function () {
            process.chdir('tests/fixtures/import');
            await expect(
                program.parseAsync(['node', 'env-tool', 'import', 'input.env'])
            ).rejects.toThrow();
        });

        it('should error when no environment variables are found in the input', async function () {
            process.chdir('tests/fixtures/import');
            (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
                if (String(filePath).includes('envconfig.json')) {
                    return JSON.stringify({});
                }
                if (String(filePath).includes('empty.env')) {
                    return '';
                }
                return "";
            });
            await program.parseAsync(['node', 'env-tool', 'import', 'empty.env', '-o', 'out.env']);
            expect(process.exitCode).toEqual(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No environment variables found'));
        });

        it('should write imported values to the output file without encrypting unflagged keys', async function () {
            process.chdir('tests/fixtures/import');
            (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
                if (String(filePath).includes('envconfig.json')) {
                    return JSON.stringify({
                        PLAIN: { required: true, default: '', comment: 'A plain value' }
                    });
                }
                if (String(filePath).includes('input.env')) {
                    return 'PLAIN=hello\n';
                }
                return "";
            });
            await program.parseAsync(['node', 'env-tool', 'import', 'input.env', '-o', 'out.env']);

            expect(process.exitCode).toEqual(0);
            const outCall = (fs.writeFileSync as jest.Mock).mock.calls.find(
                call => String(call[0]).includes('out.env')
            );
            expect(outCall).toBeTruthy();
            expect(outCall[1]).toContain('PLAIN=hello');
        });
    });
});

