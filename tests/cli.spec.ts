import {createCli} from "../src/cli";
import fs from "fs";
import {Command} from "commander";
import {loadSchema} from "../src/lib";

const schemaTempFile = 'envconfig.json';

describe('env-tool cli', function () {

    const rootDir = process.cwd();
    let program: Command;
    const consoleWarn = console.warn;
    beforeEach(() => {
        process.exitCode = 0;
        process.chdir(rootDir);
        program = createCli();
        console.warn = jest.fn()
    })

    afterEach(() => {
        process.exitCode = 0;
        process.chdir(rootDir);
        console.warn = consoleWarn;
    })

    describe('init', function () {

        it('should init env from existing code', function () {
            process.chdir('tests/fixtures/init')
            program.parse(['init', 'src'], {from: 'user'})
            expect(fs.existsSync(schemaTempFile)).toBeTruthy()

            try {
                fs.unlinkSync(schemaTempFile);
            } catch (e) {
                console.error(e);
            }
        })

        it('should error if existing schema with --force option', function () {
            process.chdir('tests/fixtures/init-force')
            try {
                program.parse(['init', 'src'], {from: 'user'})

            } catch (e: any) {
                expect(e.exitCode).toEqual(1);
                expect(e.code).toEqual('SCHEMA_EXISTS');
            }
        })

        it('should overwrite existing schema using --force', function () {
            function mkEmptySchema() {
                fs.writeFileSync(schemaTempFile, '{}');
            }

            process.chdir('tests/fixtures/init-force-override')
            mkEmptySchema()
            program.parse(['init', 'src', '--force'], {from: 'user'});

            const schema = loadSchema(schemaTempFile);
            expect(Object.keys(schema).length).toBeGreaterThan(0)
            try {
                fs.unlinkSync(schemaTempFile);
            } catch (e) {
                console.error(e);
            }
        })
    })


    describe('audit', function () {


        it ('should exit 0 if no undocumented vars are found', function() {
            process.chdir('tests/fixtures/audit')
            program.parse(['audit', 'src-good'], {from: 'user'});

            expect(process.exitCode).toEqual(0);
        })

        it ('should exit with error if undocumented vars are found', function() {
            process.chdir('tests/fixtures/audit')

                program.parse(['audit', 'src-bad'], {from: 'user'});
                expect(process.exitCode).toEqual(1);

                //@ts-ignore
                const output = console.warn.mock.lastCall[0];
                expect(output).toContain('is not defined')
        })

    })

    describe('validate', function() {

        it ('should exit with error if env file has missing required vars', function() {

            process.chdir('tests/fixtures/validate')
            try {
                program.parse(['validate', 'undefined-vars.env'], {from: 'user'});
            } catch (e: any) {
                expect(e.exitCode).toEqual(1);
                expect(e.code).toEqual('VALIDATE_FAIL');
            }

        })

        it ('should exit with error if required vars have no value', function() {
            process.chdir('tests/fixtures/validate')
            try {
                program.parse(['validate', 'missing-vars.env'], {from: 'user'});
            } catch (e: any) {
                expect(e.exitCode).toEqual(1);
                expect(e.code).toEqual('VALIDATE_FAIL');
            }
        })

        it ('should exit 0 if env file matches schema', function() {
            process.chdir('tests/fixtures/validate')
            program.parse(['validate', 'good.env'], {from: 'user'});

            expect(process.exitCode).toEqual(0);
        })
    });

    describe('sync', function() {
        it ('should output an env file based on the schema', function() {
            process.chdir('tests/fixtures/sync');
            program.parse(['sync', 'out.env'], {from: "user"});

            expect(fs.existsSync('out.env')).toBeTruthy();
            expect(fs.readFileSync('out.env').length).toBeGreaterThan(0)

            // cleanup
            fs.unlinkSync('out.env');
        })

        it ('should update an env if one already exists', function() {
            process.chdir('tests/fixtures/sync');
            fs.writeFileSync('out.env', `
                ### Comment
                TEST_ENV_VAR=not_default_value
            `)
            program.parse(['sync', 'out.env'], {from: "user"});

            expect(fs.existsSync('out.env')).toBeTruthy()
            expect(fs.readFileSync('out.env').length).toBeGreaterThan(0)
            expect(fs.readFileSync('out.env').toString()).toContain('TEST_ENV_VAR=not_default_value')
            expect(fs.readFileSync('out.env').toString()).toContain('TEST_VAR_2=default_value')

            // cleanup
            fs.unlinkSync('out.env');
        })
    })
})

