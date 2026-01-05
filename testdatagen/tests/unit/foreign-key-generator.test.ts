import { ForeignKeyGenerator } from '../../src/core/generator/foreign-key-generator';
import { ColumnDefinition, GenerationContext, ForeignKeyConstraint, GeneratedRecord } from '../../src/types';

describe('ForeignKeyGenerator', () => {
  let generator: ForeignKeyGenerator;
  let context: GenerationContext;

  beforeEach(() => {
    generator = new ForeignKeyGenerator();

    const usersData: GeneratedRecord[] = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
      { id: 3, name: 'Bob' }
    ];

    context = {
      rowIndex: 0,
      tableName: 'orders',
      allData: new Map([['users', usersData]]),
      existingValues: new Map(),
      seed: 42
    };
  });

  describe('generate', () => {
    it('should generate value from referenced table', () => {
      const column: ColumnDefinition = {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id']
      };

      const value = generator.generate(column, fk, context);

      expect([1, 2, 3]).toContain(value);
    });

    it('should throw error if referenced table has no data', () => {
      const column: ColumnDefinition = {
        name: 'product_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['product_id'],
        referencedTable: 'products',
        referencedColumns: ['id']
      };

      expect(() => generator.generate(column, fk, context)).toThrow();
    });

    it('should generate consistent values with seed', () => {
      const column: ColumnDefinition = {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id']
      };

      const context1 = { ...context, rowIndex: 5 };
      const context2 = { ...context, rowIndex: 5 };

      const value1 = generator.generate(column, fk, context1);
      const value2 = generator.generate(column, fk, context2);

      expect(value1).toBe(value2);
    });

    it('should handle composite foreign keys', () => {
      const compositeData: GeneratedRecord[] = [
        { dept_id: 1, emp_id: 100 },
        { dept_id: 2, emp_id: 200 }
      ];

      const ctx: GenerationContext = {
        ...context,
        allData: new Map([['departments', compositeData]])
      };

      const column: ColumnDefinition = {
        name: 'dept_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['dept_id', 'emp_id'],
        referencedTable: 'departments',
        referencedColumns: ['dept_id', 'emp_id']
      };

      const value = generator.generate(column, fk, ctx);

      expect([1, 2]).toContain(value);
    });

    it('should throw error if column not in FK constraint', () => {
      const column: ColumnDefinition = {
        name: 'other_column',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id']
      };

      expect(() => generator.generate(column, fk, context)).toThrow();
    });

    it('should throw error if referenced column not found', () => {
      const column: ColumnDefinition = {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['nonexistent']
      };

      expect(() => generator.generate(column, fk, context)).toThrow();
    });
  });

  describe('generateWithDistribution', () => {
    it('should generate with uniform distribution by default', () => {
      const column: ColumnDefinition = {
        name: 'user_id',
        type: 'INTEGER',
        nullable: false
      };

      const fk: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id']
      };

      const value = generator.generateWithDistribution(column, fk, context, 'uniform');

      expect([1, 2, 3]).toContain(value);
    });
  });
});
