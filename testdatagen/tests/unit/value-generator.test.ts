import { ValueGenerator } from '../../src/core/generator/value-generator';
import { ColumnDefinition, GenerationContext } from '../../src/types';

describe('ValueGenerator', () => {
  let generator: ValueGenerator;
  let context: GenerationContext;

  beforeEach(() => {
    generator = new ValueGenerator(42);
    context = {
      rowIndex: 0,
      tableName: 'test_table',
      allData: new Map(),
      existingValues: new Map()
    };
  });

  describe('data type generation', () => {
    it('generates INTEGER values', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value as number)).toBe(true);
    });

    it('generates BIGINT values', () => {
      const column: ColumnDefinition = {
        name: 'big_id',
        type: 'BIGINT',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
      expect(Number.isInteger(value as number)).toBe(true);
    });

    it('generates SMALLINT values', () => {
      const column: ColumnDefinition = {
        name: 'small_num',
        type: 'SMALLINT',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(-32768);
      expect(value).toBeLessThanOrEqual(32767);
    });

    it('generates VARCHAR values', () => {
      const column: ColumnDefinition = {
        name: 'name',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeLessThanOrEqual(100);
    });

    it('generates TEXT values', () => {
      const column: ColumnDefinition = {
        name: 'description',
        type: 'TEXT',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
    });

    it('generates DECIMAL values', () => {
      const column: ColumnDefinition = {
        name: 'price',
        type: 'DECIMAL',
        precision: 10,
        scale: 2,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
    });

    it('generates FLOAT values', () => {
      const column: ColumnDefinition = {
        name: 'rating',
        type: 'FLOAT',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
    });

    it('generates BOOLEAN values', () => {
      const column: ColumnDefinition = {
        name: 'is_active',
        type: 'BOOLEAN',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('boolean');
    });

    it('generates DATE values', () => {
      const column: ColumnDefinition = {
        name: 'created_at',
        type: 'DATE',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(new Date(value as string).toString()).not.toBe('Invalid Date');
    });

    it('generates DATETIME values', () => {
      const column: ColumnDefinition = {
        name: 'updated_at',
        type: 'DATETIME',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(new Date(value as string).toString()).not.toBe('Invalid Date');
    });

    it('generates TIMESTAMP values', () => {
      const column: ColumnDefinition = {
        name: 'timestamp',
        type: 'TIMESTAMP',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(new Date(value as string).toString()).not.toBe('Invalid Date');
    });

    it('generates TIME values', () => {
      const column: ColumnDefinition = {
        name: 'time',
        type: 'TIME',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('generates UUID values', () => {
      const column: ColumnDefinition = {
        name: 'uuid',
        type: 'UUID',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('generates JSON values', () => {
      const column: ColumnDefinition = {
        name: 'metadata',
        type: 'JSON',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(() => JSON.parse(value as string)).not.toThrow();
    });

    it('generates JSONB values', () => {
      const column: ColumnDefinition = {
        name: 'config',
        type: 'JSONB',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(() => JSON.parse(value as string)).not.toThrow();
    });

    it('generates BINARY values', () => {
      const column: ColumnDefinition = {
        name: 'data',
        type: 'BINARY',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe('semantic column detection', () => {
    it('generates email for email columns', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('generates phone numbers for phone columns', () => {
      const column: ColumnDefinition = {
        name: 'phone_number',
        type: 'VARCHAR',
        length: 20,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates first names for first_name columns', () => {
      const column: ColumnDefinition = {
        name: 'first_name',
        type: 'VARCHAR',
        length: 50,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates last names for last_name columns', () => {
      const column: ColumnDefinition = {
        name: 'last_name',
        type: 'VARCHAR',
        length: 50,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates full names for name columns', () => {
      const column: ColumnDefinition = {
        name: 'name',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates addresses for address columns', () => {
      const column: ColumnDefinition = {
        name: 'address',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates cities for city columns', () => {
      const column: ColumnDefinition = {
        name: 'city',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates countries for country columns', () => {
      const column: ColumnDefinition = {
        name: 'country',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates zip codes for postal code columns', () => {
      const column: ColumnDefinition = {
        name: 'zip_code',
        type: 'VARCHAR',
        length: 10,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates company names for company columns', () => {
      const column: ColumnDefinition = {
        name: 'company',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates descriptions for description columns', () => {
      const column: ColumnDefinition = {
        name: 'description',
        type: 'TEXT',
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates URLs for url columns', () => {
      const column: ColumnDefinition = {
        name: 'url',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string)).toMatch(/^https?:\/\//);
    });

    it('generates usernames for username columns', () => {
      const column: ColumnDefinition = {
        name: 'username',
        type: 'VARCHAR',
        length: 50,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });

    it('generates passwords for password columns', () => {
      const column: ColumnDefinition = {
        name: 'password',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });
  });

  describe('nullable columns', () => {
    it('sometimes generates null for nullable columns', () => {
      const column: ColumnDefinition = {
        name: 'optional_field',
        type: 'VARCHAR',
        length: 100,
        nullable: true
      };

      const values = Array.from({ length: 100 }, () => generator.generate(column, context));
      const nullCount = values.filter(v => v === null).length;

      expect(nullCount).toBeGreaterThan(0);
      expect(nullCount).toBeLessThan(100);
    });

    it('never generates null for non-nullable columns', () => {
      const column: ColumnDefinition = {
        name: 'required_field',
        type: 'VARCHAR',
        length: 100,
        nullable: false
      };

      const values = Array.from({ length: 100 }, () => generator.generate(column, context));
      const nullCount = values.filter(v => v === null).length;

      expect(nullCount).toBe(0);
    });
  });

  describe('default values', () => {
    it('uses default value when specified', () => {
      const column: ColumnDefinition = {
        name: 'status',
        type: 'VARCHAR',
        length: 20,
        nullable: false,
        defaultValue: 'pending'
      };

      const value = generator.generate(column, context);
      expect(value).toBe('pending');
    });
  });

  describe('locale support', () => {
    it('supports en_US locale', () => {
      const gen = new ValueGenerator(42, 'en_US');
      expect(gen.getLocale()).toBe('en_US');
    });

    it('supports en_GB locale', () => {
      const gen = new ValueGenerator(42, 'en_GB');
      expect(gen.getLocale()).toBe('en_GB');
    });

    it('supports de_DE locale', () => {
      const gen = new ValueGenerator(42, 'de_DE');
      expect(gen.getLocale()).toBe('de_DE');
    });

    it('supports fr_FR locale', () => {
      const gen = new ValueGenerator(42, 'fr_FR');
      expect(gen.getLocale()).toBe('fr_FR');
    });

    it('can change locale', () => {
      const gen = new ValueGenerator(42, 'en_US');
      expect(gen.getLocale()).toBe('en_US');

      gen.setLocale('fr_FR');
      expect(gen.getLocale()).toBe('fr_FR');
    });
  });

  describe('deterministic generation with seed', () => {
    it('generates same values with same seed', () => {
      const column: ColumnDefinition = {
        name: 'random_field',
        type: 'VARCHAR',
        length: 50,
        nullable: false
      };

      const gen1 = new ValueGenerator(123);
      const gen2 = new ValueGenerator(123);

      const value1 = gen1.generate(column, context);
      const value2 = gen2.generate(column, context);

      expect(value1).toBe(value2);
    });

    it('can reset to reproduce values', () => {
      const column: ColumnDefinition = {
        name: 'field',
        type: 'INTEGER',
        nullable: false
      };

      const gen = new ValueGenerator(456);

      const firstValue = gen.generate(column, context);
      gen.generate(column, context); // Generate another value

      gen.reset();
      const resetValue = gen.generate(column, context);

      expect(resetValue).toBe(firstValue);
    });
  });

  describe('respects column constraints', () => {
    it('respects VARCHAR length constraint', () => {
      const column: ColumnDefinition = {
        name: 'short_text',
        type: 'VARCHAR',
        length: 10,
        nullable: false
      };

      const values = Array.from({ length: 50 }, () => generator.generate(column, context));

      values.forEach(value => {
        expect((value as string).length).toBeLessThanOrEqual(10);
      });
    });

    it('respects DECIMAL precision and scale', () => {
      const column: ColumnDefinition = {
        name: 'amount',
        type: 'DECIMAL',
        precision: 8,
        scale: 2,
        nullable: false
      };

      const value = generator.generate(column, context);
      expect(typeof value).toBe('number');
      expect(value).toBeLessThan(Math.pow(10, 6)); // 10^(precision - scale)
    });
  });
});
