import {createCli} from "../src/cli";
import {assert, expect} from "chai";
import fs from "fs";
import {Command, CommanderError} from "commander";
import {loadSchema} from "../src/lib";
import {afterEach} from "mocha";

const schemaTempFile = 'envconfig.json';

describe('env-tool cli', function () {

    const rootDir = process.cwd();
    let program: Command;

    beforeEach(() => {
        process.chdir(rootDir);
        program = createCli();
    })

    afterEach(() => {
        process.exitCode = 0;
        process.chdir(rootDir);
    })

    describe('init', function () {

        it('should init env from existing code', function () {
            process.chdir('tests/fixtures/init')
            program.parse(['init', 'src'], {from: 'user'})
            expect(fs.existsSync(schemaTempFile)).to.be.true;

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
                expect(e.exitCode).to.be.equal(1);
                expect(e.code).to.be.equal('SCHEMA_EXISTS');
            }
        })

        it('should overwrite existing schema using --force', function () {
            // todo: test override flag: no exit code, overwrites empty file with new stuff
            function mkEmptySchema() {
                fs.writeFileSync(schemaTempFile, '{}');
            }

            process.chdir('tests/fixtures/init-force-override')
            mkEmptySchema()
            program.parse(['init', 'src', '--force'], {from: 'user'});

            const schema = loadSchema(schemaTempFile);
            expect(Object.keys(schema)).to.have.length.greaterThan(0)
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

            expect(process.exitCode).to.be.equal(0);
        })

        it ('should exit with error if undocumented vars are found', function() {
            process.chdir('tests/fixtures/audit')
            program.parse(['audit', 'src-bad'], {from: 'user'});

            expect(process.exitCode).to.be.equal(1);
        })

    })

    describe('validate', function() {

        it ('should exit with error if env file has missing required vars', function() {

            process.chdir('tests/fixtures/validate')
            program.parse(['validate', 'undefined-vars.env'], {from: 'user'});

            expect(process.exitCode).to.equal(1);
        })

        it ('should exit with error if required vars have no value', function() {

            process.chdir('tests/fixtures/validate')
            program.parse(['validate', 'missing-vars.env'], {from: 'user'});

            expect(process.exitCode).to.equal(1);
        })

        it ('should exit 0 if env file matches schema', function() {
            process.chdir('tests/fixtures/validate')
            program.parse(['validate', 'good.env'], {from: 'user'});

            expect(process.exitCode).to.equal(0);
        })
    });

    describe('sync', function() {
        it ('should output an env file based on the schema', function() {
            process.chdir('tests/fixtures/sync');
            program.parse(['sync', 'out.env'], {from: "user"});

            expect(fs.existsSync('out.env')).to.be.true;
            expect(fs.readFileSync('out.env')).to.have.length.greaterThan(0)

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

            expect(fs.existsSync('out.env')).to.be.true;
            expect(fs.readFileSync('out.env')).to.have.length.greaterThan(0)
            expect(fs.readFileSync('out.env').toString()).to.contain('TEST_ENV_VAR=not_default_value')
            expect(fs.readFileSync('out.env').toString()).to.contain('TEST_VAR_2=default_value')

            // cleanup
            fs.unlinkSync('out.env');
        })
    })
})

