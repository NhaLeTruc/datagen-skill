import { UniqueGenerator } from '../../src/core/generator/unique-generator';
import { ColumnDefinition, GenerationContext } from '../../src/types';

describe('UniqueGenerator', () => {
  let generator: UniqueGenerator;
  let context: GenerationContext;

  beforeEach(() => {
    generator = new UniqueGenerator();
    context = {
      rowIndex: 0,
      tableName: 'users',
      allData: new Map(),
      existingValues: new Map()
    };
  });

  describe('generate', () => {
    it('should generate unique values', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      let counter = 0;
      const valueGenerator = () => `user${counter++}@example.com`;

      const value1 = generator.generate(column, 'users', context, valueGenerator);
      const value2 = generator.generate(column, 'users', context, valueGenerator);
      const value3 = generator.generate(column, 'users', context, valueGenerator);

      expect(value1).not.toBe(value2);
      expect(value2).not.toBe(value3);
      expect(value1).not.toBe(value3);
    });

    it('should throw error after max attempts', () => {
      const column: ColumnDefinition = {
        name: 'status',
        type: 'VARCHAR',
        length: 10,
        nullable: false
      };

      const valueGenerator = () => 'same-value';

      generator.setMaxAttempts(10);

      generator.generate(column, 'users', context, valueGenerator);

      expect(() => {
        generator.generate(column, 'users', context, valueGenerator);
      }).toThrow();
    });

    it('should track separate uniqueness per table and column', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      let counter1 = 0;
      let counter2 = 0;

      const value1 = generator.generate(column, 'users', context, () => counter1++);
      const value2 = generator.generate(column, 'products', context, () => counter2++);

      expect(value1).toBe(0);
      expect(value2).toBe(0);
    });

    it('should handle 1000 unique values', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      let counter = 0;
      const valueGenerator = () => `user${counter++}@example.com`;

      const values = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const value = generator.generate(column, 'users', context, valueGenerator);
        values.add(value);
      }

      expect(values.size).toBe(1000);
    });
  });

  describe('generateComposite', () => {
    it('should generate unique composite values', () => {
      const columns = ['first_name', 'last_name'];
      const valueGenerators = new Map<string, () => any>();

      let firstCounter = 0;
      let lastCounter = 0;
      valueGenerators.set('first_name', () => `First${firstCounter++}`);
      valueGenerators.set('last_name', () => `Last${lastCounter++}`);

      const values1 = generator.generateComposite(columns, 'users', context, valueGenerators);
      const values2 = generator.generateComposite(columns, 'users', context, valueGenerators);

      expect(values1).not.toEqual(values2);
    });

    it('should throw error if generator missing', () => {
      const columns = ['first_name', 'last_name'];
      const valueGenerators = new Map<string, () => any>();
      valueGenerators.set('first_name', () => 'First');

      expect(() => {
        generator.generateComposite(columns, 'users', context, valueGenerators);
      }).toThrow();
    });
  });

  describe('isUsed', () => {
    it('should return true for used value', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      generator.generate(column, 'users', context, () => 'test@example.com');

      expect(generator.isUsed('users', 'email', 'test@example.com')).toBe(true);
    });

    it('should return false for unused value', () => {
      expect(generator.isUsed('users', 'email', 'unused@example.com')).toBe(false);
    });
  });

  describe('markUsed', () => {
    it('should mark value as used', () => {
      generator.markUsed('users', 'email', 'test@example.com');

      expect(generator.isUsed('users', 'email', 'test@example.com')).toBe(true);
    });
  });

  describe('getUniqueCount', () => {
    it('should return count of unique values', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      let counter = 0;
      generator.generate(column, 'users', context, () => `user${counter++}@example.com`);
      generator.generate(column, 'users', context, () => `user${counter++}@example.com`);
      generator.generate(column, 'users', context, () => `user${counter++}@example.com`);

      expect(generator.getUniqueCount('users', 'email')).toBe(3);
    });

    it('should return 0 for non-existent column', () => {
      expect(generator.getUniqueCount('users', 'nonexistent')).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all tracked values', () => {
      const column: ColumnDefinition = {
        name: 'email',
        type: 'VARCHAR',
        length: 255,
        nullable: false
      };

      generator.generate(column, 'users', context, () => 'test@example.com');
      generator.reset();

      expect(generator.getUniqueCount('users', 'email')).toBe(0);
    });
  });

  describe('resetTable', () => {
    it('should reset tracked values for specific table', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      generator.generate(column, 'users', context, () => 1);
      generator.generate(column, 'products', context, () => 1);

      generator.resetTable('users');

      expect(generator.getUniqueCount('users', 'id')).toBe(0);
      expect(generator.getUniqueCount('products', 'id')).toBe(1);
    });
  });

  describe('isCompositeUsed', () => {
    it('should check if composite value is used', () => {
      const columns = ['first_name', 'last_name'];
      const values = new Map<string, any>();
      values.set('first_name', 'John');
      values.set('last_name', 'Doe');

      generator.markCompositeUsed('users', columns, values);

      expect(generator.isCompositeUsed('users', columns, values)).toBe(true);
    });
  });
});
