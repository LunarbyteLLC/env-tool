import {audit, initSchema, loadSchema, scanVars} from "../src/lib";
import {expect} from "chai";
import path from "path";

describe('env checker library', function () {


    it ('loads a schema', function() {

        const schemaPath = path.join(__dirname, '/fixtures/schema/envconfig.json');

        const schema = loadSchema(schemaPath);
        expect(schema).to.have.all.keys([
            'MY_API_KEY',
            'ENABLE_MAIL_SEND',
            'FROM_EMAIL',
        ]);

    })
    it ('should scan a directory for usages of env vars', function() {

        const auditDir = path.join(__dirname, '/fixtures/audit')
        const vars = scanVars(auditDir);

        expect(vars).to.have.members([
            'MY_API_KEY',
            'ENABLE_MAIL_SEND',
            'FROM_EMAIL',
            'ENCRYPTION_KEY'
        ])
    });

    it('should audit code to find undocumented usages of process.env', function() {

        const schemaPath = path.join(__dirname, '/fixtures/schema/envconfig.json');
        const auditDir = path.join(__dirname, '/fixtures/audit')
        const schema = loadSchema(schemaPath);
        const usages = scanVars(auditDir);

        const auditResult = audit(usages, schema);
        expect(auditResult).length(1);
    })

    it ('should create an initial schema based on existing vars', function() {
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
})