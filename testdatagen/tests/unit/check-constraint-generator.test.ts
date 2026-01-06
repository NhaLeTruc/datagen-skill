import { ValueGenerator } from '../../src/core/generator/value-generator';
import { ColumnSchema } from '../../src/types';

describe('CheckConstraintGenerator', () => {
  let generator: ValueGenerator;

  beforeEach(() => {
    generator = new ValueGenerator({ seed: 42 });
  });

  describe('numeric CHECK constraints', () => {
    it('generates values within range constraint', () => {
      const column: ColumnSchema = {
        name: 'age',
        type: 'INTEGER',
        constraints: {
          check: 'age >= 0 AND age <= 120'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(120);
      }
    });

    it('generates values for minimum constraint only', () => {
      const column: ColumnSchema = {
        name: 'price',
        type: 'DECIMAL',
        constraints: {
          check: 'price > 0'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });

    it('generates values for maximum constraint only', () => {
      const column: ColumnSchema = {
        name: 'discount',
        type: 'DECIMAL',
        constraints: {
          check: 'discount <= 100'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeLessThanOrEqual(100);
      }
    });

    it('handles inequality constraints', () => {
      const column: ColumnSchema = {
        name: 'quantity',
        type: 'INTEGER',
        constraints: {
          check: 'quantity != 0'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(value).not.toBe(0);
      }
    });
  });

  describe('string CHECK constraints', () => {
    it('generates values matching IN constraint', () => {
      const column: ColumnSchema = {
        name: 'status',
        type: 'VARCHAR(20)',
        constraints: {
          check: "status IN ('pending', 'approved', 'rejected')"
        }
      };

      const allowedValues = new Set(['pending', 'approved', 'rejected']);

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(allowedValues.has(value as string)).toBe(true);
      }
    });

    it('generates values matching enum-like constraint', () => {
      const column: ColumnSchema = {
        name: 'priority',
        type: 'TEXT',
        constraints: {
          check: "priority IN ('low', 'medium', 'high', 'critical')"
        }
      };

      const allowedValues = new Set(['low', 'medium', 'high', 'critical']);

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(allowedValues.has(value as string)).toBe(true);
      }
    });

    it('generates values with length constraint', () => {
      const column: ColumnSchema = {
        name: 'code',
        type: 'VARCHAR(10)',
        constraints: {
          check: 'LENGTH(code) = 5'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect((value as string).length).toBe(5);
      }
    });

    it('generates values matching pattern constraint', () => {
      const column: ColumnSchema = {
        name: 'email',
        type: 'VARCHAR(255)',
        constraints: {
          check: "email LIKE '%@%'"
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect((value as string).includes('@')).toBe(true);
      }
    });
  });

  describe('combined CHECK constraints', () => {
    it('satisfies multiple AND conditions', () => {
      const column: ColumnSchema = {
        name: 'score',
        type: 'INTEGER',
        constraints: {
          check: 'score >= 0 AND score <= 100 AND score % 5 = 0'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
        expect((value as number) % 5).toBe(0);
      }
    });

    it('satisfies OR conditions', () => {
      const column: ColumnSchema = {
        name: 'category',
        type: 'VARCHAR(20)',
        constraints: {
          check: "category = 'A' OR category = 'B' OR category = 'C'"
        }
      };

      const allowedValues = new Set(['A', 'B', 'C']);

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(allowedValues.has(value as string)).toBe(true);
      }
    });
  });

  describe('date/time CHECK constraints', () => {
    it('generates dates within range', () => {
      const column: ColumnSchema = {
        name: 'birth_date',
        type: 'DATE',
        constraints: {
          check: "birth_date >= '1900-01-01' AND birth_date <= '2024-12-31'"
        }
      };

      const minDate = new Date('1900-01-01');
      const maxDate = new Date('2024-12-31');

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        const date = new Date(value as string);
        expect(date >= minDate).toBe(true);
        expect(date <= maxDate).toBe(true);
      }
    });

    it('generates future dates', () => {
      const column: ColumnSchema = {
        name: 'expires_at',
        type: 'TIMESTAMP',
        constraints: {
          check: 'expires_at > CURRENT_TIMESTAMP'
        }
      };

      const now = new Date();

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        const date = new Date(value as string);
        expect(date > now).toBe(true);
      }
    });
  });

  describe('complex business rule constraints', () => {
    it('handles cross-column dependencies (simulated)', () => {
      // For a discount that must be less than price
      const priceColumn: ColumnSchema = {
        name: 'price',
        type: 'DECIMAL',
        constraints: {
          check: 'price > 0'
        }
      };

      const discountColumn: ColumnSchema = {
        name: 'discount',
        type: 'DECIMAL',
        constraints: {
          check: 'discount >= 0 AND discount < 100'
        }
      };

      for (let i = 0; i < 100; i++) {
        const price = generator.generate(priceColumn);
        const discount = generator.generate(discountColumn);

        expect(typeof price).toBe('number');
        expect(typeof discount).toBe('number');
        expect(price).toBeGreaterThan(0);
        expect(discount).toBeGreaterThanOrEqual(0);
        expect(discount).toBeLessThan(100);
      }
    });

    it('handles conditional constraints', () => {
      const column: ColumnSchema = {
        name: 'shipping_cost',
        type: 'DECIMAL',
        constraints: {
          check: 'shipping_cost >= 0'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty CHECK constraint', () => {
      const column: ColumnSchema = {
        name: 'data',
        type: 'VARCHAR(100)',
        constraints: {}
      };

      const value = generator.generate(column);
      expect(value).toBeDefined();
    });

    it('handles very restrictive constraints', () => {
      const column: ColumnSchema = {
        name: 'exact_value',
        type: 'INTEGER',
        constraints: {
          check: 'exact_value = 42'
        }
      };

      for (let i = 0; i < 10; i++) {
        const value = generator.generate(column);
        expect(value).toBe(42);
      }
    });

    it('handles percentage constraints', () => {
      const column: ColumnSchema = {
        name: 'completion',
        type: 'INTEGER',
        constraints: {
          check: 'completion >= 0 AND completion <= 100'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('constraint parsing', () => {
    it('parses simple numeric comparisons', () => {
      const constraints = [
        'age > 18',
        'age >= 18',
        'age < 65',
        'age <= 65',
        'age = 25',
        'age != 0'
      ];

      constraints.forEach(check => {
        const column: ColumnSchema = {
          name: 'age',
          type: 'INTEGER',
          constraints: { check }
        };

        const value = generator.generate(column);
        expect(value).toBeDefined();
      });
    });

    it('parses BETWEEN constraints', () => {
      const column: ColumnSchema = {
        name: 'rating',
        type: 'INTEGER',
        constraints: {
          check: 'rating BETWEEN 1 AND 5'
        }
      };

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    });

    it('handles case-insensitive keywords', () => {
      const column: ColumnSchema = {
        name: 'status',
        type: 'VARCHAR(20)',
        constraints: {
          check: "STATUS in ('active', 'INACTIVE')"
        }
      };

      const allowedValues = new Set(['active', 'INACTIVE']);

      for (let i = 0; i < 100; i++) {
        const value = generator.generate(column);
        expect(allowedValues.has(value as string)).toBe(true);
      }
    });
  });
});
