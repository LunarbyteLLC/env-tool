import {
    audit,
    buildImportedEnvContent,
    generateEnvFile,
    getKeysToEncrypt,
    initSchema,
    loadSchema,
    scanVars,
    syncEnvFile,
    validate
} from "../src/lib";
import {expect} from "chai";
import path from "path";

describe('env checker library', function () {


    it('loads a schema', function () {

        const schemaPath = path.join(__dirname, '/fixtures/schema/envconfig.json');

        const schema = loadSchema(schemaPath);
        expect(schema).to.have.all.keys([
            'MY_API_KEY',
            'ENABLE_MAIL_SEND',
            'FROM_EMAIL',
        ]);

    })
    it('should scan a directory for usages of env vars', function () {

        const auditDir = path.join(__dirname, '/fixtures/audit')
        const vars = scanVars(auditDir);

        expect(vars).to.have.members([
            'MY_API_KEY',
            'ENABLE_MAIL_SEND',
            'FROM_EMAIL',
            'ENCRYPTION_KEY'
        ])
    });

    it('should audit code to find undocumented usages of process.env', function () {

        const schemaPath = path.join(__dirname, '/fixtures/schema/envconfig.json');
        const auditDir = path.join(__dirname, '/fixtures/audit')
        const schema = loadSchema(schemaPath);
        const usages = scanVars(auditDir);

        const auditResult = audit(usages, schema);
        expect(auditResult).length(1);
        expect(auditResult[0]).to.contain('is not defined')
    })

    it('should create an initial schema based on existing vars', function () {
        const vars = ['TEST_1', 'TEST_2'];
        const schema = initSchema(vars);
        expect(schema).to.have.all.keys(vars)
        expect(schema).to.have.nested.property('TEST_1.comment')
        expect(schema).to.have.nested.property('TEST_1.required')
        expect(schema).to.have.nested.property('TEST_1.default')
        expect(schema).to.have.nested.property('TEST_2.comment')
        expect(schema).to.have.nested.property('TEST_2.required')
        expect(schema).to.have.nested.property('TEST_2.default')
    })

    it('should generate an env file based on a schema', function () {
        const schema = {
            TEST: {
                comment: 'test comment',
                default: 'a_default_value',
                required: true,
            }
        };

        const envContents = generateEnvFile(schema);
        expect(envContents).to.match(/^### test comment$/gm)
        expect(envContents).to.match(/^TEST=a_default_value$/gm)
    })

    it('should validate env contents against the schema', function () {

        const schema = {
            NO_PROBLEM: {
                default: '',
                comment: '',
                required: true
            },
            NOT_DEFINED: {
                default: '',
                comment: '',
                required: true,
            },
            NOT_REQUIRED: {
                default: '',
                comment: '',
                required: false,
            },
            NO_VALUE: {
                default: '',
                comment: '',
                required: true,
            }
        }

        const envValues = {
            NO_PROBLEM: 'a_valid_value',
            NO_VALUE: ''
        };

        const validationResult = validate(schema, envValues);
        expect(validationResult).to.deep.include({key: 'NOT_DEFINED', error: 'not_defined'});
        expect(validationResult).to.deep.include({key: 'NO_VALUE', error: 'no_value'})
    });

    it('should output an env file based on the schema', function () {

        const schema = {
            EXISTING_VAR: {
                required: true,
                default: '',
                comment: 'This value already exists in the env'
            },
            NEW_VAR: {
                required: true,
                default: 'a_new_value',
                comment: 'This will be added to the env file'
            }
        };

        const currentValues = {
            EXISTING_VAR: 'an_existing_value',
        }

        const newEnv = syncEnvFile(schema, currentValues);

        expect(newEnv).matches(/^EXISTING_VAR=an_existing_value$/gm);
        expect(newEnv).matches(/^NEW_VAR=a_new_value$/gm);
    })

    it('should build imported env contents using the same formatting as sync, including comments', function () {
        const schema = {
            EXISTING_VAR: {
                required: true,
                default: '',
                comment: 'This value already exists in the env'
            },
            NEW_VAR: {
                required: true,
                default: 'a_new_value',
                comment: 'This will be added to the env file'
            }
        };

        const values = {
            EXISTING_VAR: 'an_existing_value',
        };

        const content = buildImportedEnvContent(schema, values);

        expect(content).matches(/^### This value already exists in the env$/gm);
        expect(content).matches(/^EXISTING_VAR=an_existing_value$/gm);
        expect(content).matches(/^### This will be added to the env file$/gm);
        expect(content).matches(/^NEW_VAR=a_new_value$/gm);
    });

    it('should preserve values not documented in the schema', function () {
        const schema = {
            DOCUMENTED: {required: true, default: ''},
        };

        const values = {
            DOCUMENTED: 'a_value',
            DOTENV_PUBLIC_KEY: 'abc123',
            LEGACY_UNDOCUMENTED_VAR: 'still_here',
        };

        const content = buildImportedEnvContent(schema, values);

        expect(content).matches(/^DOCUMENTED=a_value$/gm);
        expect(content).matches(/^DOTENV_PUBLIC_KEY=abc123$/gm);
        expect(content).matches(/^LEGACY_UNDOCUMENTED_VAR=still_here$/gm);
    });

    it('should always place the DOTENV_PUBLIC_KEY entry first, ahead of schema and other undocumented keys', function () {
        const schema = {
            DOCUMENTED: {required: true, default: '', comment: 'a documented var'},
        };

        const values = {
            LEGACY_UNDOCUMENTED_VAR: 'still_here',
            DOCUMENTED: 'a_value',
            DOTENV_PUBLIC_KEY: 'abc123',
        };

        const content = buildImportedEnvContent(schema, values);
        const lines = content.split('\n').filter(line => line.length > 0);

        expect(lines[0]).to.equal('DOTENV_PUBLIC_KEY=abc123');
    });

    it('should place a named DOTENV_PUBLIC_KEY_<ENV> entry first as well', function () {
        const schema = {
            DOCUMENTED: {required: true, default: ''},
        };

        const values = {
            DOCUMENTED: 'a_value',
            DOTENV_PUBLIC_KEY_PRODUCTION: 'abc123',
        };

        const content = buildImportedEnvContent(schema, values);
        const lines = content.split('\n').filter(line => line.length > 0);

        expect(lines[0]).to.equal('DOTENV_PUBLIC_KEY_PRODUCTION=abc123');
    });

    it('should return an empty string when there are no schema keys or values to import', function () {
        expect(buildImportedEnvContent({}, {})).to.equal('');
    });

    it('should determine which keys are flagged for encryption in the schema', function () {
        const schema = {
            SECRET: {required: true, default: '', encrypted: true},
            PLAIN: {required: true, default: ''},
            NOT_IMPORTED: {required: true, default: '', encrypted: true},
        };

        const keysToEncrypt = getKeysToEncrypt(schema, ['SECRET', 'PLAIN']);
        expect(keysToEncrypt).to.deep.equal(['SECRET']);
    });
})