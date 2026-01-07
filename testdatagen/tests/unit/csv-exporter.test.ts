import { CSVExporter } from '../../src/core/exporter/csv-exporter';
import { TableData, SchemaDefinition, GenerationOptions } from '../../src/types';

describe('CSVExporter', () => {
  const schema: SchemaDefinition = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'email', type: 'VARCHAR', nullable: true }
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
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
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
    format: 'csv'
  };

  describe('export', () => {
    it('should export data as CSV', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    it('should include section headers for each table', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('# users');
      expect(output).toContain('# orders');
    });

    it('should include column headers', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('id,name,email');
      expect(output).toContain('id,user_id,total');
    });

    it('should have correct number of data rows', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const dataLines = lines.filter(l => !l.includes('id,') || l.split(',').length > 2);

      expect(dataLines.length).toBeGreaterThan(3);
    });

    it('should preserve numeric values', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('99.99');
      expect(output).toContain('49.99');
      expect(output).toContain('199.99');
    });

    it('should preserve string values', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
    });
  });

  describe('exportSeparateFiles', () => {
    it('should export each table to separate CSV', () => {
      const exporter = new CSVExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      expect(outputs.size).toBe(2);
      expect(outputs.has('users.csv')).toBe(true);
      expect(outputs.has('orders.csv')).toBe(true);
    });

    it('should have correct table names', () => {
      const exporter = new CSVExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      const filenames = Array.from(outputs.keys());
      expect(filenames).toContain('users.csv');
      expect(filenames).toContain('orders.csv');
    });

    it('should include headers in each file', () => {
      const exporter = new CSVExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      for (const [filename, content] of outputs) {
        const lines = content.split('\n');
        const headerLine = lines.find(l => l.includes('id'));
        expect(headerLine).toBeDefined();
      }
    });

    it('should have correct row counts', () => {
      const exporter = new CSVExporter();
      const outputs = exporter.exportSeparateFiles(tableData, schema, options);

      const usersOutput = outputs.get('users.csv');
      const ordersOutput = outputs.get('orders.csv');

      expect(usersOutput).toBeDefined();
      expect(ordersOutput).toBeDefined();

      const usersLines = usersOutput!.split('\n').filter(l => l.trim());
      const ordersLines = ordersOutput!.split('\n').filter(l => l.trim());

      expect(usersLines.length).toBeGreaterThanOrEqual(3);
      expect(ordersLines.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('exportWithDelimiter', () => {
    it('should use custom delimiter', () => {
      const exporter = new CSVExporter();
      const output = exporter.exportWithDelimiter(tableData, schema, options, '|');

      expect(output).toContain('id|name|email');
      expect(output).toContain('1|Alice|');
    });

    it('should handle tab delimiter', () => {
      const exporter = new CSVExporter();
      const output = exporter.exportWithDelimiter(tableData, schema, options, '\t');

      expect(output).toContain('id\tname\temail');
    });

    it('should handle semicolon delimiter', () => {
      const exporter = new CSVExporter();
      const output = exporter.exportWithDelimiter(tableData, schema, options, ';');

      expect(output).toContain('id;name;email');
      expect(output).toContain('1;Alice;');
    });
  });

  describe('exportWithHeaders', () => {
    it('should include headers when enabled', () => {
      const exporter = new CSVExporter();
      const output = exporter.exportWithHeaders(tableData, schema, options, true);

      expect(output).toContain('id,name,email');
    });

    it('should exclude headers when disabled', () => {
      const exporter = new CSVExporter();
      const output = exporter.exportWithHeaders(tableData, schema, options, false);

      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const firstDataLine = lines.find(l => !l.startsWith('#'));

      expect(firstDataLine).not.toContain('id,name,email');
      expect(firstDataLine).toMatch(/^\d/);
    });
  });

  describe('CSV escaping', () => {
    it('should escape commas in values', () => {
      const dataWithCommas: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'Smith, John', email: 'john@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(dataWithCommas, schema, options);

      expect(output).toContain('"Smith, John"');
    });

    it('should escape quotes in values', () => {
      const dataWithQuotes: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'O"Reilly', email: 'oreilly@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(dataWithQuotes, schema, options);

      expect(output).toContain('""');
    });

    it('should escape newlines in values', () => {
      const dataWithNewlines: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'John\nDoe', email: 'john@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(dataWithNewlines, schema, options);

      expect(output).toContain('"John\nDoe"');
    });

    it('should handle values with multiple special characters', () => {
      const complexData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'Smith, "John" Jr.\nPhD', email: 'john@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(complexData, schema, options);

      const lines = output.split('\n');
      const dataLine = lines.find(l => l.includes('Smith'));
      expect(dataLine).toBeDefined();
      expect(dataLine).toContain('"');
    });
  });

  describe('edge cases', () => {
    it('should handle null values', () => {
      const nullData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: 'Alice', email: null },
            { id: 2, name: 'Bob', email: 'bob@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(nullData, schema, options);

      expect(output).toBeDefined();
      const lines = output.split('\n');
      const aliceLine = lines.find(l => l.includes('Alice'));
      expect(aliceLine).toContain(',,');
    });

    it('should handle empty strings', () => {
      const emptyData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: '', email: 'test@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(emptyData, schema, options);

      expect(output).toContain('""');
    });

    it('should handle zero values', () => {
      const zeroData: TableData[] = [
        {
          table: 'orders',
          records: [
            { id: 1, user_id: 1, total: 0 }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(zeroData, schema, options);

      expect(output).toContain(',0');
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

      const exporter = new CSVExporter();
      const output = exporter.export(boolData, schemaWithBool, options);

      expect(output).toContain('true');
      expect(output).toContain('false');
    });

    it('should handle empty tables', () => {
      const emptyData: TableData[] = [
        { table: 'users', records: [] }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(emptyData, schema, options);

      expect(output).toContain('# users');
      expect(output).toContain('id,name,email');
    });

    it('should handle Unicode characters', () => {
      const unicodeData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: '中文', email: 'test@example.com' },
            { id: 2, name: '😀', email: 'emoji@example.com' },
            { id: 3, name: 'Ñoño', email: 'spanish@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(unicodeData, schema, options);

      expect(output).toContain('中文');
      expect(output).toContain('😀');
      expect(output).toContain('Ñoño');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(1000);
      const longData: TableData[] = [
        {
          table: 'users',
          records: [
            { id: 1, name: longString, email: 'test@example.com' }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(longData, schema, options);

      expect(output).toContain(longString);
    });

    it('should handle negative numbers', () => {
      const negativeData: TableData[] = [
        {
          table: 'orders',
          records: [
            { id: 1, user_id: 1, total: -99.99 }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(negativeData, schema, options);

      expect(output).toContain('-99.99');
    });

    it('should handle decimal precision', () => {
      const decimalData: TableData[] = [
        {
          table: 'orders',
          records: [
            { id: 1, user_id: 1, total: 123.456789 }
          ]
        }
      ];

      const exporter = new CSVExporter();
      const output = exporter.export(decimalData, schema, options);

      expect(output).toContain('123.456789');
    });
  });

  describe('column ordering', () => {
    it('should maintain column order from schema', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      const lines = output.split('\n');
      const usersHeader = lines.find(l => l.includes('id,name,email'));
      expect(usersHeader).toBeDefined();
      expect(usersHeader!.indexOf('id')).toBeLessThan(usersHeader!.indexOf('name'));
      expect(usersHeader!.indexOf('name')).toBeLessThan(usersHeader!.indexOf('email'));
    });
  });
});
