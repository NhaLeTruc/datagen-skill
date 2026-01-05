import { JSONExporter } from '../../src/core/exporter/json-exporter';
import { TableData, SchemaDefinition, GenerationOptions } from '../../src/types';

describe('JSONExporter', () => {
  const schema: SchemaDefinition = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false }
        ],
        constraints: []
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'user_id', type: 'INT', nullable: false },
          { name: 'total', type: 'DECIMAL', precision: 10, scale: 2, nullable: false }
        ],
        constraints: []
      }
    ]
  };

  const tableData: TableData[] = [
    {
      table: 'users',
      records: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    },
    {
      table: 'orders',
      records: [
        { id: 1, user_id: 1, total: 99.99 },
        { id: 2, user_id: 1, total: 49.99 },
        { id: 3, user_id: 2, total: 199.99 }
      ]
    }
  ];

  const options: GenerationOptions = {
    count: 2,
    seed: 12345,
    locale: 'en_US',
    format: 'json'
  };

  describe('export', () => {
    it('should export data as JSON', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    it('should produce valid JSON', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);

      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include metadata', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('generator');
      expect(parsed.metadata).toHaveProperty('timestamp');
      expect(parsed.metadata).toHaveProperty('recordCount');
      expect(parsed.metadata).toHaveProperty('options');
    });

    it('should include all tables', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('tables');
      expect(parsed.tables).toHaveProperty('users');
      expect(parsed.tables).toHaveProperty('orders');
    });

    it('should include correct record counts', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users).toHaveLength(2);
      expect(parsed.tables.orders).toHaveLength(3);
      expect(parsed.metadata.recordCount).toBe(5);
    });

    it('should preserve record data', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users[0]).toEqual({ id: 1, name: 'Alice' });
      expect(parsed.tables.users[1]).toEqual({ id: 2, name: 'Bob' });
      expect(parsed.tables.orders[0]).toEqual({ id: 1, user_id: 1, total: 99.99 });
    });

    it('should include generation options in metadata', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.metadata.options.count).toBe(2);
      expect(parsed.metadata.options.seed).toBe(12345);
      expect(parsed.metadata.options.locale).toBe('en_US');
    });

    it('should be pretty-printed by default', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('\n');
      expect(output).toContain('  ');
    });
  });

  describe('exportSeparateFiles', () => {
    it('should export each table to separate JSON', () => {
      const exporter = new JSONExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      expect(outputs).toHaveLength(2);
      expect(outputs[0]).toHaveProperty('table');
      expect(outputs[0]).toHaveProperty('content');
    });

    it('should produce valid JSON for each file', () => {
      const exporter = new JSONExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      for (const output of outputs) {
        expect(() => JSON.parse(output.content)).not.toThrow();
      }
    });

    it('should have correct table names', () => {
      const exporter = new JSONExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      const tableNames = outputs.map(o => o.table);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('orders');
    });

    it('should include metadata in each file', () => {
      const exporter = new JSONExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      for (const output of outputs) {
        const parsed = JSON.parse(output.content);
        expect(parsed).toHaveProperty('metadata');
        expect(parsed).toHaveProperty('table');
        expect(parsed).toHaveProperty('records');
      }
    });

    it('should include only table-specific records', () => {
      const exporter = new JSONExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      const usersOutput = outputs.find(o => o.table === 'users');
      const ordersOutput = outputs.find(o => o.table === 'orders');

      expect(usersOutput).toBeDefined();
      expect(ordersOutput).toBeDefined();

      const usersParsed = JSON.parse(usersOutput!.content);
      const ordersParsed = JSON.parse(ordersOutput!.content);

      expect(usersParsed.records).toHaveLength(2);
      expect(ordersParsed.records).toHaveLength(3);
    });
  });

  describe('exportJSONLines', () => {
    it('should export in JSON Lines format', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportJSONLines(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    it('should have one JSON object per line', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportJSONLines(tableData, schema, options);

      const lines = output.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      for (const line of lines) {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      }
    });

    it('should include table name in each record', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportJSONLines(tableData, schema, options);

      const lines = output.trim().split('\n');
      const records = lines.map(line => JSON.parse(line));

      expect(records.every(r => r._table !== undefined)).toBe(true);
    });

    it('should preserve record data', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportJSONLines(tableData, schema, options);

      const lines = output.trim().split('\n');
      const records = lines.map(line => JSON.parse(line));

      const userRecords = records.filter(r => r._table === 'users');
      const orderRecords = records.filter(r => r._table === 'orders');

      expect(userRecords).toHaveLength(2);
      expect(orderRecords).toHaveLength(3);
    });

    it('should have correct total record count', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportJSONLines(tableData, schema, options);

      const lines = output.trim().split('\n').filter(l => l.trim());
      expect(lines.length).toBe(5);
    });
  });

  describe('exportCompact', () => {
    it('should export without pretty-printing', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportCompact(tableData, schema, options);

      const parsed = JSON.parse(output);
      expect(parsed).toBeDefined();
    });

    it('should be more compact than regular export', () => {
      const exporter = new JSONExporter();
      const regular = exporter.export(tableData, schema, options);
      const compact = exporter.exportCompact(tableData, schema, options);

      expect(compact.length).toBeLessThan(regular.length);
    });

    it('should not have newlines (except in data)', () => {
      const exporter = new JSONExporter();
      const output = exporter.exportCompact(tableData, schema, options);

      const withoutDataNewlines = output.replace(/"[^"]*"/g, '');
      const newlineCount = (withoutDataNewlines.match(/\n/g) || []).length;

      expect(newlineCount).toBe(0);
    });

    it('should contain same data as regular export', () => {
      const exporter = new JSONExporter();
      const regular = JSON.parse(exporter.export(tableData, schema, options));
      const compact = JSON.parse(exporter.exportCompact(tableData, schema, options));

      expect(compact.tables.users).toEqual(regular.tables.users);
      expect(compact.tables.orders).toEqual(regular.tables.orders);
    });
  });

  describe('edge cases', () => {
    it('should handle empty tables', () => {
      const emptyData: TableData[] = [
        { table: 'users', records: [] }
      ];

      const exporter = new JSONExporter();
      const output = exporter.export(emptyData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users).toHaveLength(0);
      expect(parsed.metadata.recordCount).toBe(0);
    });

    it('should handle special characters in data', () => {
      const specialData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'Alice "Wonder" O\'Reilly' },
            { id: 2, name: 'Bob\nNewline\tTab' }
          ]
        }
      ];

      const exporter = new JSONExporter();
      const output = exporter.export(specialData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users[0].name).toBe('Alice "Wonder" O\'Reilly');
      expect(parsed.tables.users[1].name).toBe('Bob\nNewline\tTab');
    });

    it('should handle null values', () => {
      const nullData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: null },
            { id: 2, name: 'Bob' }
          ]
        }
      ];

      const exporter = new JSONExporter();
      const output = exporter.export(nullData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users[0].name).toBeNull();
      expect(parsed.tables.users[1].name).toBe('Bob');
    });

    it('should handle numeric values correctly', () => {
      const numericData: TableData[] = [
        {
          table: 'orders',
          records: [
            { id: 1, user_id: 1, total: 0 },
            { id: 2, user_id: 2, total: 99.99 },
            { id: 3, user_id: 3, total: -10.50 }
          ]
        }
      ];

      const exporter = new JSONExporter();
      const output = exporter.export(numericData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.orders[0].total).toBe(0);
      expect(parsed.tables.orders[1].total).toBe(99.99);
      expect(parsed.tables.orders[2].total).toBe(-10.50);
    });

    it('should handle boolean values', () => {
      const boolData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'Alice', active: true },
            { id: 2, name: 'Bob', active: false }
          ]
        }
      ];

      const schemaWithBool: SchemaDefinition = {
        tables: [{
          name: 'users',
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'active', type: 'BOOLEAN', nullable: false }
          ],
          constraints: []
        }]
      };

      const exporter = new JSONExporter();
      const output = exporter.export(boolData, schemaWithBool, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users[0].active).toBe(true);
      expect(parsed.tables.users[1].active).toBe(false);
    });

    it('should handle Unicode characters', () => {
      const unicodeData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: '中文测试' },
            { id: 2, name: '😀😁😂' },
            { id: 3, name: 'Ñoño' }
          ]
        }
      ];

      const exporter = new JSONExporter();
      const output = exporter.export(unicodeData, schema, options);
      const parsed = JSON.parse(output);

      expect(parsed.tables.users[0].name).toBe('中文测试');
      expect(parsed.tables.users[1].name).toBe('😀😁😂');
      expect(parsed.tables.users[2].name).toBe('Ñoño');
    });
  });
});
