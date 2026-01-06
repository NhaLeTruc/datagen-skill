import { ConfigParser } from '../../src/utils/config-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('ConfigParser', () => {
  let parser: ConfigParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new ConfigParser();
    tempDir = '/tmp/testdatagen-test-' + Date.now();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('JSON config parsing', () => {
    it('parses valid JSON config file', () => {
      const configPath = path.join(tempDir, 'config.json');
      const config = {
        count: 1000,
        seed: 42,
        locale: 'en_US',
        format: 'sql'
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.count).toBe(1000);
      expect(parsed.seed).toBe(42);
      expect(parsed.locale).toBe('en_US');
      expect(parsed.format).toBe('sql');
    });

    it('validates required fields', () => {
      const configPath = path.join(tempDir, 'invalid.json');
      const config = {
        seed: 42
        // Missing count
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });

    it('applies default values for optional fields', () => {
      const configPath = path.join(tempDir, 'minimal.json');
      const config = {
        count: 100
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.count).toBe(100);
      expect(parsed.format).toBe('sql'); // Default
      expect(parsed.locale).toBe('en_US'); // Default
    });
  });

  describe('YAML config parsing', () => {
    it('parses valid YAML config file', () => {
      const configPath = path.join(tempDir, 'config.yaml');
      const yaml = `
count: 5000
seed: 12345
locale: en_GB
format: json
edgeCasePercentage: 10
distributions:
  - column: users.age
    type: normal
    params:
      mean: 35
      std: 12
      `;

      fs.writeFileSync(configPath, yaml);

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.count).toBe(5000);
      expect(parsed.seed).toBe(12345);
      expect(parsed.locale).toBe('en_GB');
      expect(parsed.distributions).toHaveLength(1);
      expect(parsed.distributions[0].type).toBe('normal');
    });

    it('handles YAML arrays correctly', () => {
      const configPath = path.join(tempDir, 'arrays.yaml');
      const yaml = `
count: 1000
distributions:
  - column: product_id
    type: zipf
    params:
      s: 1.5
  - column: age
    type: normal
    params:
      mean: 30
      std: 10
      `;

      fs.writeFileSync(configPath, yaml);

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.distributions).toHaveLength(2);
      expect(parsed.distributions[0].column).toBe('product_id');
      expect(parsed.distributions[1].column).toBe('age');
    });
  });

  describe('distribution configuration', () => {
    it('parses Zipf distribution config', () => {
      const config = {
        count: 1000,
        distributions: [
          {
            column: 'orders.product_id',
            type: 'zipf',
            params: { s: 1.5 }
          }
        ]
      };

      const configPath = path.join(tempDir, 'zipf.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.distributions[0].type).toBe('zipf');
      expect(parsed.distributions[0].params.s).toBe(1.5);
    });

    it('parses Normal distribution config', () => {
      const config = {
        count: 1000,
        distributions: [
          {
            column: 'users.age',
            type: 'normal',
            params: { mean: 35, std: 12 }
          }
        ]
      };

      const configPath = path.join(tempDir, 'normal.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.distributions[0].type).toBe('normal');
      expect(parsed.distributions[0].params.mean).toBe(35);
      expect(parsed.distributions[0].params.std).toBe(12);
    });

    it('validates distribution parameters', () => {
      const config = {
        count: 1000,
        distributions: [
          {
            column: 'users.age',
            type: 'normal'
            // Missing params
          }
        ]
      };

      const configPath = path.join(tempDir, 'invalid-dist.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });
  });

  describe('custom generator configuration', () => {
    it('parses custom pattern generators', () => {
      const config = {
        count: 100,
        customGenerators: [
          {
            column: 'users.employee_code',
            pattern: 'EMP-#####'
          },
          {
            column: 'products.sku',
            pattern: 'SKU-@@@@-####'
          }
        ]
      };

      const configPath = path.join(tempDir, 'custom.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.customGenerators).toHaveLength(2);
      expect(parsed.customGenerators[0].pattern).toBe('EMP-#####');
      expect(parsed.customGenerators[1].pattern).toBe('SKU-@@@@-####');
    });

    it('validates custom generator patterns', () => {
      const config = {
        count: 100,
        customGenerators: [
          {
            column: 'test.field'
            // Missing pattern
          }
        ]
      };

      const configPath = path.join(tempDir, 'invalid-custom.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });
  });

  describe('edge case configuration', () => {
    it('parses edge case percentage', () => {
      const config = {
        count: 1000,
        edgeCasePercentage: 15
      };

      const configPath = path.join(tempDir, 'edge.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.edgeCasePercentage).toBe(15);
    });

    it('validates edge case percentage range', () => {
      const config = {
        count: 1000,
        edgeCasePercentage: 150 // Invalid: > 100
      };

      const configPath = path.join(tempDir, 'invalid-edge.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });

    it('applies default edge case percentage', () => {
      const config = {
        count: 1000
      };

      const configPath = path.join(tempDir, 'default-edge.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.edgeCasePercentage).toBe(5); // Default
    });
  });

  describe('output configuration', () => {
    it('parses output format', () => {
      const formats = ['sql', 'json', 'csv', 'django', 'rails', 'prisma'];

      formats.forEach(format => {
        const config = {
          count: 100,
          format
        };

        const configPath = path.join(tempDir, `format-${format}.json`);
        fs.writeFileSync(configPath, JSON.stringify(config));

        const parsed = parser.parseConfigFile(configPath);
        expect(parsed.format).toBe(format);
      });
    });

    it('validates output format', () => {
      const config = {
        count: 100,
        format: 'invalid-format'
      };

      const configPath = path.join(tempDir, 'invalid-format.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });

    it('parses output path', () => {
      const config = {
        count: 100,
        output: '/tmp/output.sql'
      };

      const configPath = path.join(tempDir, 'output.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.output).toBe('/tmp/output.sql');
    });
  });

  describe('locale configuration', () => {
    it('parses valid locales', () => {
      const locales = ['en_US', 'en_GB', 'de', 'fr', 'ca', 'au'];

      locales.forEach(locale => {
        const config = {
          count: 100,
          locale
        };

        const configPath = path.join(tempDir, `locale-${locale}.json`);
        fs.writeFileSync(configPath, JSON.stringify(config));

        const parsed = parser.parseConfigFile(configPath);
        expect(parsed.locale).toBe(locale);
      });
    });

    it('validates locale', () => {
      const config = {
        count: 100,
        locale: 'invalid_LOCALE'
      };

      const configPath = path.join(tempDir, 'invalid-locale.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });
  });

  describe('streaming configuration', () => {
    it('parses streaming options', () => {
      const config = {
        count: 1000000,
        streaming: true,
        batchSize: 10000
      };

      const configPath = path.join(tempDir, 'streaming.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.streaming).toBe(true);
      expect(parsed.batchSize).toBe(10000);
    });

    it('applies default batch size for streaming', () => {
      const config = {
        count: 1000000,
        streaming: true
      };

      const configPath = path.join(tempDir, 'streaming-default.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.batchSize).toBe(1000); // Default
    });
  });

  describe('database connection configuration', () => {
    it('parses database connection string', () => {
      const config = {
        count: 1000,
        database: 'postgres://user:pass@localhost:5432/testdb'
      };

      const configPath = path.join(tempDir, 'db.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.database).toBe('postgres://user:pass@localhost:5432/testdb');
    });

    it('parses introspection mode', () => {
      const config = {
        count: 1000,
        introspect: true,
        database: 'postgres://localhost/db'
      };

      const configPath = path.join(tempDir, 'introspect.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.introspect).toBe(true);
      expect(parsed.database).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws error for non-existent file', () => {
      expect(() => parser.parseConfigFile('/nonexistent/config.json')).toThrow();
    });

    it('throws error for invalid JSON', () => {
      const configPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });

    it('throws error for invalid YAML', () => {
      const configPath = path.join(tempDir, 'invalid.yaml');
      fs.writeFileSync(configPath, 'invalid: yaml: syntax:');

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });

    it('provides meaningful error messages', () => {
      const configPath = path.join(tempDir, 'error.json');
      const config = {
        count: -100 // Invalid negative count
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      try {
        parser.parseConfigFile(configPath);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('count');
      }
    });
  });

  describe('config merging', () => {
    it('merges CLI args with config file', () => {
      const configPath = path.join(tempDir, 'base.json');
      const config = {
        count: 1000,
        seed: 42,
        locale: 'en_US'
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      const cliArgs = {
        count: 2000, // Override
        format: 'json' // Add new
      };

      const merged = parser.mergeConfig(configPath, cliArgs);

      expect(merged.count).toBe(2000); // CLI override
      expect(merged.seed).toBe(42); // From file
      expect(merged.format).toBe('json'); // From CLI
      expect(merged.locale).toBe('en_US'); // From file
    });

    it('CLI args take precedence over config file', () => {
      const configPath = path.join(tempDir, 'precedence.json');
      const config = {
        count: 1000,
        seed: 42
      };

      fs.writeFileSync(configPath, JSON.stringify(config));

      const cliArgs = {
        seed: 99999
      };

      const merged = parser.mergeConfig(configPath, cliArgs);

      expect(merged.seed).toBe(99999);
    });
  });

  describe('schema reference', () => {
    it('parses schema file path', () => {
      const config = {
        count: 1000,
        schema: './schema.sql'
      };

      const configPath = path.join(tempDir, 'schema-ref.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.schema).toBe('./schema.sql');
    });

    it('validates schema file exists', () => {
      const config = {
        count: 1000,
        schema: '/nonexistent/schema.sql'
      };

      const configPath = path.join(tempDir, 'invalid-schema.json');
      fs.writeFileSync(configPath, JSON.stringify(config));

      expect(() => parser.parseConfigFile(configPath)).toThrow();
    });
  });

  describe('complex configuration', () => {
    it('parses complete real-world config', () => {
      const config = {
        count: 10000,
        seed: 42,
        locale: 'en_GB',
        format: 'sql',
        output: './output',
        edgeCasePercentage: 10,
        streaming: true,
        batchSize: 1000,
        distributions: [
          {
            column: 'orders.product_id',
            type: 'zipf',
            params: { s: 1.5 }
          },
          {
            column: 'users.age',
            type: 'normal',
            params: { mean: 35, std: 12 }
          }
        ],
        customGenerators: [
          {
            column: 'users.employee_id',
            pattern: 'EMP-#####'
          }
        ]
      };

      const configPath = path.join(tempDir, 'complete.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const parsed = parser.parseConfigFile(configPath);

      expect(parsed.count).toBe(10000);
      expect(parsed.distributions).toHaveLength(2);
      expect(parsed.customGenerators).toHaveLength(1);
      expect(parsed.streaming).toBe(true);
    });
  });
});
