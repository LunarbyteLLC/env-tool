import {createCli} from "../src/cli";
import {expect} from "chai";
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