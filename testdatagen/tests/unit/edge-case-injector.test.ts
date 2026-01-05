import { EdgeCaseInjector } from '../../src/core/generator/edge-case-injector';
import { ColumnDefinition, GeneratedRecord } from '../../src/types';

describe('EdgeCaseInjector', () => {
  describe('constructor', () => {
    it('should create with default percentage', () => {
      const injector = new EdgeCaseInjector();
      expect(injector).toBeDefined();
    });

    it('should create with custom percentage', () => {
      const injector = new EdgeCaseInjector(10);
      expect(injector).toBeDefined();
    });

    it('should clamp percentage to valid range', () => {
      const injector1 = new EdgeCaseInjector(-10);
      const injector2 = new EdgeCaseInjector(150);

      expect(injector1).toBeDefined();
      expect(injector2).toBeDefined();
    });

    it('should create with seed for reproducibility', () => {
      const injector = new EdgeCaseInjector(10, 12345);
      expect(injector).toBeDefined();
    });
  });

  describe('shouldInject', () => {
    it('should return boolean', () => {
      const injector = new EdgeCaseInjector(50);
      const result = injector.shouldInject();
      expect(typeof result).toBe('boolean');
    });

    it('should inject approximately at specified percentage', () => {
      const injector = new EdgeCaseInjector(25, 12345);
      const trials = 1000;
      let injected = 0;

      for (let i = 0; i < trials; i++) {
        if (injector.shouldInject()) {
          injected++;
        }
      }

      const percentage = (injected / trials) * 100;
      expect(percentage).toBeGreaterThan(20);
      expect(percentage).toBeLessThan(30);
    });

    it('should be reproducible with seed', () => {
      const injector1 = new EdgeCaseInjector(50, 12345);
      const injector2 = new EdgeCaseInjector(50, 12345);

      const results1: boolean[] = [];
      const results2: boolean[] = [];

      for (let i = 0; i < 20; i++) {
        results1.push(injector1.shouldInject());
        results2.push(injector2.shouldInject());
      }

      expect(results1).toEqual(results2);
    });
  });

  describe('inject', () => {
    const columns: ColumnDefinition[] = [
      { name: 'id', type: 'INT', nullable: false },
      { name: 'name', type: 'VARCHAR', length: 100, nullable: true },
      { name: 'age', type: 'INT', nullable: true },
      { name: 'email', type: 'VARCHAR', length: 255, nullable: true }
    ];

    it('should return original record when not injecting', () => {
      const injector = new EdgeCaseInjector(0, 12345);
      const record: GeneratedRecord = { id: 1, name: 'John', age: 30, email: 'john@example.com' };

      const result = injector.inject(record, columns);

      expect(result).toEqual(record);
    });

    it('should modify record when injecting', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const record: GeneratedRecord = { id: 1, name: 'John', age: 30, email: 'john@example.com' };

      const result = injector.inject(record, columns);

      const modified = Object.keys(result).some(key => result[key] !== record[key]);
      expect(modified).toBe(true);
    });

    it('should not modify columns in exclude list', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const record: GeneratedRecord = { id: 1, name: 'John', age: 30 };

      const result = injector.inject(record, columns, ['id']);

      expect(result.id).toBe(record.id);
    });

    it('should not modify non-nullable columns', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const record: GeneratedRecord = { id: 1, name: 'John', age: 30 };

      const result = injector.inject(record, columns);

      expect(result.id).toBe(record.id);
    });

    it('should handle records with no eligible columns', () => {
      const nonNullableColumns: ColumnDefinition[] = [
        { name: 'id', type: 'INT', nullable: false },
        { name: 'name', type: 'VARCHAR', nullable: false }
      ];

      const injector = new EdgeCaseInjector(100, 12345);
      const record: GeneratedRecord = { id: 1, name: 'John' };

      const result = injector.inject(record, nonNullableColumns);

      expect(result).toEqual(record);
    });
  });

  describe('injectBatch', () => {
    const columns: ColumnDefinition[] = [
      { name: 'id', type: 'INT', nullable: false },
      { name: 'value', type: 'VARCHAR', nullable: true }
    ];

    it('should inject into multiple records', () => {
      const injector = new EdgeCaseInjector(50, 12345);
      const records: GeneratedRecord[] = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' },
        { id: 4, value: 'd' },
        { id: 5, value: 'e' }
      ];

      const results = injector.injectBatch(records, columns);

      expect(results).toHaveLength(5);

      const modified = results.filter((r, i) => r.value !== records[i].value).length;
      expect(modified).toBeGreaterThan(0);
    });

    it('should maintain record count', () => {
      const injector = new EdgeCaseInjector(10, 12345);
      const records: GeneratedRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `value${i}`
      }));

      const results = injector.injectBatch(records, columns);

      expect(results).toHaveLength(100);
    });
  });

  describe('edge cases for INT types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'int_val', type: 'INT', nullable: true }
    ];

    it('should inject boundary values for INT', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 100; i++) {
        const record: GeneratedRecord = { int_val: 42 };
        const result = injector.inject(record, columns);
        if (result.int_val !== 42) {
          edgeCases.add(result.int_val);
        }
      }

      expect(edgeCases.size).toBeGreaterThan(0);
      expect([...edgeCases].some(v => v === 0 || v === -1 || v === 1)).toBe(true);
    });
  });

  describe('edge cases for VARCHAR types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'str_val', type: 'VARCHAR', nullable: true }
    ];

    it('should inject special string values', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 200; i++) {
        const record: GeneratedRecord = { str_val: 'normal' };
        const result = injector.inject(record, columns);
        if (result.str_val !== 'normal') {
          edgeCases.add(result.str_val);
        }
      }

      expect(edgeCases.size).toBeGreaterThan(1);

      const hasEmptyString = [...edgeCases].some(v => v === '');
      const hasSpecialChars = [...edgeCases].some(v =>
        typeof v === 'string' && (v.includes("'") || v.includes('"') || v.includes('\\'))
      );

      expect(hasEmptyString || hasSpecialChars).toBe(true);
    });
  });

  describe('edge cases for FLOAT types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'float_val', type: 'FLOAT', nullable: true }
    ];

    it('should inject boundary float values', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 100; i++) {
        const record: GeneratedRecord = { float_val: 3.14 };
        const result = injector.inject(record, columns);
        if (result.float_val !== 3.14) {
          edgeCases.add(result.float_val);
        }
      }

      expect(edgeCases.size).toBeGreaterThan(0);
      expect([...edgeCases].some(v => v === 0 || v === 0.0)).toBe(true);
    });
  });

  describe('edge cases for DATE types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'date_val', type: 'DATE', nullable: true }
    ];

    it('should inject boundary date values', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 100; i++) {
        const record: GeneratedRecord = { date_val: '2023-01-01' };
        const result = injector.inject(record, columns);
        if (result.date_val !== '2023-01-01') {
          edgeCases.add(result.date_val);
        }
      }

      expect(edgeCases.size).toBeGreaterThan(0);
      const hasEpoch = [...edgeCases].some(v => v === '1970-01-01');
      const has2038 = [...edgeCases].some(v => v === '2038-01-19');

      expect(hasEpoch || has2038).toBe(true);
    });
  });

  describe('edge cases for BOOLEAN types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'bool_val', type: 'BOOLEAN', nullable: true }
    ];

    it('should inject true/false values', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 50; i++) {
        const record: GeneratedRecord = { bool_val: null };
        const result = injector.inject(record, columns);
        if (result.bool_val !== null) {
          edgeCases.add(result.bool_val);
        }
      }

      expect(edgeCases.has(true) || edgeCases.has(false)).toBe(true);
    });
  });

  describe('edge cases for JSON types', () => {
    const columns: ColumnDefinition[] = [
      { name: 'json_val', type: 'JSON', nullable: true }
    ];

    it('should inject JSON edge cases', () => {
      const injector = new EdgeCaseInjector(100, 12345);
      const edgeCases = new Set<any>();

      for (let i = 0; i < 100; i++) {
        const record: GeneratedRecord = { json_val: '{"normal": true}' };
        const result = injector.inject(record, columns);
        if (result.json_val !== '{"normal": true}') {
          edgeCases.add(result.json_val);
        }
      }

      expect(edgeCases.size).toBeGreaterThan(0);
      const hasEmpty = [...edgeCases].some(v => v === '{}' || v === '[]');
      expect(hasEmpty).toBe(true);
    });
  });

  describe('getStatistics', () => {
    const columns: ColumnDefinition[] = [
      { name: 'id', type: 'INT', nullable: false },
      { name: 'value', type: 'VARCHAR', nullable: true }
    ];

    it('should return statistics about injected edge cases', () => {
      const injector = new EdgeCaseInjector(50, 12345);
      const records: GeneratedRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: `value${i}`
      }));

      const modified = injector.injectBatch(records, columns);
      const stats = injector.getStatistics(modified, columns);

      expect(stats).toHaveProperty('totalRecords');
      expect(stats).toHaveProperty('modifiedRecords');
      expect(stats).toHaveProperty('edgeCasesByType');

      expect(stats.totalRecords).toBe(100);
      expect(typeof stats.modifiedRecords).toBe('number');
      expect(typeof stats.edgeCasesByType).toBe('object');
    });
  });

  describe('reset', () => {
    it('should reset and reproduce same injection pattern', () => {
      const injector = new EdgeCaseInjector(50, 12345);

      const results1: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        results1.push(injector.shouldInject());
      }

      injector.reset();

      const results2: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        results2.push(injector.shouldInject());
      }

      expect(results1).toEqual(results2);
    });
  });
});
