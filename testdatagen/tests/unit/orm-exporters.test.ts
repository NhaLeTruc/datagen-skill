import { DjangoExporter } from '../../src/core/exporter/orm-exporters/django';
import { RailsExporter } from '../../src/core/exporter/orm-exporters/rails';
import { PrismaExporter } from '../../src/core/exporter/orm-exporters/prisma';
import { TableData, SchemaDefinition, GenerationOptions } from '../../src/types';

describe('ORM Exporters', () => {
  const schema: SchemaDefinition = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'email', type: 'VARCHAR', nullable: false }
        ],
        constraints: []
      }
    ]
  };

  const tableData: TableData[] = [
    {
      table: 'users',
      records: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ]
    }
  ];

  const options: GenerationOptions = {
    count: 2,
    seed: 12345,
    locale: 'en_US',
    format: 'sql'
  };

  describe('DjangoExporter', () => {
    it('should export to Django fixtures', () => {
      const exporter = new DjangoExporter('myapp');
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');

      const fixtures = JSON.parse(output);
      expect(Array.isArray(fixtures)).toBe(true);
      expect(fixtures).toHaveLength(2);
    });

    it('should include model and pk in fixtures', () => {
      const exporter = new DjangoExporter('myapp');
      const output = exporter.export(tableData, schema, options);
      const fixtures = JSON.parse(output);

      expect(fixtures[0]).toHaveProperty('model');
      expect(fixtures[0]).toHaveProperty('pk');
      expect(fixtures[0]).toHaveProperty('fields');
      expect(fixtures[0].model).toContain('myapp');
    });

    it('should set app label', () => {
      const exporter = new DjangoExporter('testapp');
      expect(exporter.getAppLabel()).toBe('testapp');

      exporter.setAppLabel('newapp');
      expect(exporter.getAppLabel()).toBe('newapp');
    });

    it('should validate fixtures', () => {
      const exporter = new DjangoExporter();
      const fixtures = [
        { model: 'app.User', pk: 1, fields: { name: 'Alice' } },
        { model: 'app.User', pk: 2, fields: { name: 'Bob' } }
      ];

      const result = exporter.validateFixtures(fixtures);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate pks', () => {
      const exporter = new DjangoExporter();
      const fixtures = [
        { model: 'app.User', pk: 1, fields: { name: 'Alice' } },
        { model: 'app.User', pk: 1, fields: { name: 'Bob' } }
      ];

      const result = exporter.validateFixtures(fixtures);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('RailsExporter', () => {
    it('should export to Rails YAML fixtures', () => {
      const exporter = new RailsExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
      expect(output).toContain('# users');
    });

    it('should generate fixture names', () => {
      const exporter = new RailsExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('user_');
    });

    it('should parse YAML fixtures', () => {
      const exporter = new RailsExporter();
      const yamlContent = `
user_1:
  id: 1
  name: Alice
  email: alice@example.com

user_2:
  id: 2
  name: Bob
  email: bob@example.com
      `;

      const fixtures = exporter.parseFixtures(yamlContent);
      expect(fixtures).toBeDefined();
      expect(fixtures.user_1).toBeDefined();
      expect(fixtures.user_2).toBeDefined();
    });

    it('should export separate files', () => {
      const exporter = new RailsExporter();
      const files = exporter.exportSeparateFiles(tableData, schema, options);

      expect(files).toHaveLength(1);
      expect(files[0].model).toBe('users');
      expect(files[0].content).toBeDefined();
    });
  });

  describe('PrismaExporter', () => {
    it('should generate Prisma seed script', () => {
      const exporter = new PrismaExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
      expect(output).toContain('PrismaClient');
      expect(output).toContain('async function main()');
    });

    it('should include create operations', () => {
      const exporter = new PrismaExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('.create');
      expect(output).toContain('data:');
    });

    it('should export as JSON', () => {
      const exporter = new PrismaExporter();
      const output = exporter.exportAsJSON(tableData, schema);

      const parsed = JSON.parse(output);
      expect(parsed.user).toBeDefined();
      expect(Array.isArray(parsed.user)).toBe(true);
    });

    it('should generate delete script', () => {
      const exporter = new PrismaExporter();
      const output = exporter.generateDeleteScript(tableData);

      expect(output).toContain('deleteMany');
      expect(output).toContain('cleanup');
    });

    it('should generate upsert script', () => {
      const exporter = new PrismaExporter();
      const output = exporter.exportWithUpsert(tableData, schema);

      expect(output).toContain('upsert');
      expect(output).toContain('where:');
      expect(output).toContain('create:');
      expect(output).toContain('update:');
    });
  });
});
