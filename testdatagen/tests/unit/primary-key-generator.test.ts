import { PrimaryKeyGenerator } from '../../src/core/generator/primary-key-generator';
import { ColumnDefinition, GenerationContext } from '../../src/types';

describe('PrimaryKeyGenerator', () => {
  let generator: PrimaryKeyGenerator;
  let context: GenerationContext;

  beforeEach(() => {
    generator = new PrimaryKeyGenerator();
    context = {
      rowIndex: 0,
      tableName: 'users',
      allData: new Map(),
      existingValues: new Map()
    };
  });

  describe('generate', () => {
    it('should generate sequential integers for INTEGER type', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      const value1 = generator.generate(column, 'users', context);
      const value2 = generator.generate(column, 'users', context);
      const value3 = generator.generate(column, 'users', context);

      expect(value1).toBe(1);
      expect(value2).toBe(2);
      expect(value3).toBe(3);
    });

    it('should generate separate sequences for different tables', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      const value1 = generator.generate(column, 'users', context);
      const value2 = generator.generate(column, 'products', context);
      const value3 = generator.generate(column, 'users', context);

      expect(value1).toBe(1);
      expect(value2).toBe(1);
      expect(value3).toBe(2);
    });

    it('should generate UUID for UUID type', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'UUID',
        nullable: false
      };

      const value = generator.generate(column, 'users', context);

      expect(typeof value).toBe('string');
      expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate sequential strings for VARCHAR type', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'VARCHAR',
        length: 50,
        nullable: false
      };

      const value1 = generator.generate(column, 'users', context);
      const value2 = generator.generate(column, 'users', context);

      expect(typeof value1).toBe('string');
      expect(typeof value2).toBe('string');
      expect(value1).toBe('pk1');
      expect(value2).toBe('pk2');
    });

    it('should handle auto-increment columns', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        autoIncrement: true
      };

      const value1 = generator.generate(column, 'users', context);
      const value2 = generator.generate(column, 'users', context);
      const value3 = generator.generate(column, 'users', context);

      expect(value1).toBe(1);
      expect(value2).toBe(2);
      expect(value3).toBe(3);
    });

    it('should maintain separate counters for auto-increment per table', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false,
        autoIncrement: true
      };

      generator.generate(column, 'users', context);
      generator.generate(column, 'users', context);
      generator.generate(column, 'products', context);

      const usersValue = generator.generate(column, 'users', context);
      const productsValue = generator.generate(column, 'products', context);

      expect(usersValue).toBe(3);
      expect(productsValue).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      generator.generate(column, 'users', context);
      generator.generate(column, 'users', context);

      generator.reset();

      const value = generator.generate(column, 'users', context);
      expect(value).toBe(1);
    });
  });

  describe('getCounter', () => {
    it('should return current counter value', () => {
      const column: ColumnDefinition = {
        name: 'id',
        type: 'INTEGER',
        nullable: false
      };

      generator.generate(column, 'users', context);
      generator.generate(column, 'users', context);

      const counter = generator.getCounter('users.id');
      expect(counter).toBe(3);
    });

    it('should return 0 for non-existent counter', () => {
      const counter = generator.getCounter('nonexistent.id');
      expect(counter).toBe(0);
    });
  });
});
