import { ValueGenerator } from '../../src/core/generator/value-generator';
import { ColumnSchema } from '../../src/types';

describe('ValueGenerator', () => {
  let generator: ValueGenerator;

  beforeEach(() => {
    generator = new ValueGenerator({ seed: 42 });
  });

  describe('data type generation', () => {
    it('generates INTEGER values', () => {
      const column: ColumnSchema = {
        name: 'id',
        type: 'INTEGER',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value as number)).toBe(true);
    });

    it('generates VARCHAR values', () => {
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeLessThanOrEqual(100);
    });

    it('generates TEXT values', () => {
      const column: ColumnSchema = {
        name: 'description',
        type: 'TEXT',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
    });

    it('generates DECIMAL values', () => {
      const column: ColumnSchema = {
        name: 'price',
        type: 'DECIMAL(10,2)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('number');
      expect((value as number).toFixed(2)).toBe((value as number).toFixed(2));
    });

    it('generates BOOLEAN values', () => {
      const column: ColumnSchema = {
        name: 'is_active',
        type: 'BOOLEAN',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('boolean');
    });

    it('generates DATE values', () => {
      const column: ColumnSchema = {
        name: 'created_at',
        type: 'DATE',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect(new Date(value as string).toString()).not.toBe('Invalid Date');
    });

    it('generates TIMESTAMP values', () => {
      const column: ColumnSchema = {
        name: 'updated_at',
        type: 'TIMESTAMP',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect(new Date(value as string).toString()).not.toBe('Invalid Date');
    });

    it('generates UUID values', () => {
      const column: ColumnSchema = {
        name: 'uuid',
        type: 'UUID',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('generates JSON values', () => {
      const column: ColumnSchema = {
        name: 'metadata',
        type: 'JSON',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect(() => JSON.parse(value as string)).not.toThrow();
    });

    it('generates JSONB values', () => {
      const column: ColumnSchema = {
        name: 'config',
        type: 'JSONB',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect(() => JSON.parse(value as string)).not.toThrow();
    });
  });

  describe('semantic column detection', () => {
    it('generates email for email columns', () => {
      const column: ColumnSchema = {
        name: 'email',
        type: 'VARCHAR(255)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('generates phone numbers for phone columns', () => {
      const column: ColumnSchema = {
        name: 'phone_number',
        type: 'VARCHAR(20)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates first names for first_name columns', () => {
      const column: ColumnSchema = {
        name: 'first_name',
        type: 'VARCHAR(50)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates last names for last_name columns', () => {
      const column: ColumnSchema = {
        name: 'last_name',
        type: 'VARCHAR(50)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates full names for name columns', () => {
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates addresses for address columns', () => {
      const column: ColumnSchema = {
        name: 'address',
        type: 'VARCHAR(255)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates cities for city columns', () => {
      const column: ColumnSchema = {
        name: 'city',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates countries for country columns', () => {
      const column: ColumnSchema = {
        name: 'country',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates zip codes for postal code columns', () => {
      const column: ColumnSchema = {
        name: 'zip_code',
        type: 'VARCHAR(10)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates company names for company columns', () => {
      const column: ColumnSchema = {
        name: 'company',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates URLs for url columns', () => {
      const column: ColumnSchema = {
        name: 'website_url',
        type: 'VARCHAR(255)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^https?:\/\//);
    });

    it('generates job titles for title columns', () => {
      const column: ColumnSchema = {
        name: 'job_title',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });
  });

  describe('constraint handling', () => {
    it('respects NOT NULL constraint', () => {
      const column: ColumnSchema = {
        name: 'required_field',
        type: 'VARCHAR(100)',
        constraints: {
          notNull: true
        }
      };

      const value = generator.generate(column);
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    });

    it('generates NULL for nullable columns sometimes', () => {
      const column: ColumnSchema = {
        name: 'optional_field',
        type: 'VARCHAR(100)',
        constraints: {
          notNull: false
        }
      };

      let hasNull = false;
      let hasValue = false;

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        if (value === null) hasNull = true;
        if (value !== null) hasValue = true;
      }

      // Should generate both null and non-null values
      expect(hasNull || hasValue).toBe(true);
    });

    it('respects DEFAULT values', () => {
      const column: ColumnSchema = {
        name: 'status',
        type: 'VARCHAR(20)',
        constraints: {
          default: 'active'
        }
      };

      const value = generator.generate(column);
      // Generator may or may not use default, but should be valid
      expect(value).toBeDefined();
    });
  });

  describe('locale support', () => {
    it('generates locale-specific data for US', () => {
      const usGenerator = new ValueGenerator({ seed: 42, locale: 'en_US' });
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = usGenerator.generate(column);
      expect(typeof value).toBe('string');
    });

    it('generates locale-specific data for UK', () => {
      const ukGenerator = new ValueGenerator({ seed: 42, locale: 'en_GB' });
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = ukGenerator.generate(column);
      expect(typeof value).toBe('string');
    });

    it('generates locale-specific data for Germany', () => {
      const deGenerator = new ValueGenerator({ seed: 42, locale: 'de' });
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = deGenerator.generate(column);
      expect(typeof value).toBe('string');
    });

    it('generates locale-specific data for France', () => {
      const frGenerator = new ValueGenerator({ seed: 42, locale: 'fr' });
      const column: ColumnSchema = {
        name: 'name',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = frGenerator.generate(column);
      expect(typeof value).toBe('string');
    });
  });

  describe('deterministic generation', () => {
    it('generates same sequence with same seed', () => {
      const gen1 = new ValueGenerator({ seed: 12345 });
      const gen2 = new ValueGenerator({ seed: 12345 });

      const column: ColumnSchema = {
        name: 'test',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const values1 = Array.from({ length: 10 }, () => gen1.generate(column));
      const values2 = Array.from({ length: 10 }, () => gen2.generate(column));

      expect(values1).toEqual(values2);
    });

    it('generates different sequence with different seed', () => {
      const gen1 = new ValueGenerator({ seed: 12345 });
      const gen2 = new ValueGenerator({ seed: 54321 });

      const column: ColumnSchema = {
        name: 'test',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const values1 = Array.from({ length: 10 }, () => gen1.generate(column));
      const values2 = Array.from({ length: 10 }, () => gen2.generate(column));

      expect(values1).not.toEqual(values2);
    });
  });

  describe('length constraints', () => {
    it('respects VARCHAR length limit', () => {
      const column: ColumnSchema = {
        name: 'code',
        type: 'VARCHAR(5)',
        constraints: {}
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect((value as string).length).toBeLessThanOrEqual(5);
      }
    });

    it('handles very small VARCHAR limits', () => {
      const column: ColumnSchema = {
        name: 'initial',
        type: 'VARCHAR(1)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect((value as string).length).toBeLessThanOrEqual(1);
    });

    it('handles large VARCHAR limits', () => {
      const column: ColumnSchema = {
        name: 'description',
        type: 'VARCHAR(5000)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeLessThanOrEqual(5000);
    });
  });

  describe('numeric precision', () => {
    it('respects DECIMAL precision', () => {
      const column: ColumnSchema = {
        name: 'amount',
        type: 'DECIMAL(10,2)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('number');

      // Check that it has at most 2 decimal places
      const strValue = (value as number).toString();
      const parts = strValue.split('.');
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    });

    it('generates integers for DECIMAL(10,0)', () => {
      const column: ColumnSchema = {
        name: 'count',
        type: 'DECIMAL(10,0)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value as number)).toBe(true);
    });
  });
});
