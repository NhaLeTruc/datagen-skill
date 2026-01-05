import { ConstraintExtractor } from '../../src/core/analyzer/constraint-extractor';
import { TableSchema, ForeignKeyConstraint } from '../../src/types';

describe('ConstraintExtractor', () => {
  let extractor: ConstraintExtractor;

  beforeEach(() => {
    extractor = new ConstraintExtractor();
  });

  const createTable = (name: string, columns: any[], constraints: any[]): TableSchema => ({
    name,
    columns,
    constraints
  });

  describe('getPrimaryKey', () => {
    it('should extract primary key columns', () => {
      const table = createTable('users', [], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const pk = extractor.getPrimaryKey(table);

      expect(pk).toEqual(['id']);
    });

    it('should extract composite primary key', () => {
      const table = createTable('user_roles', [], [
        { type: 'PRIMARY_KEY', columns: ['user_id', 'role_id'] }
      ]);

      const pk = extractor.getPrimaryKey(table);

      expect(pk).toEqual(['user_id', 'role_id']);
    });

    it('should return empty array if no primary key', () => {
      const table = createTable('users', [], []);

      const pk = extractor.getPrimaryKey(table);

      expect(pk).toEqual([]);
    });
  });

  describe('getForeignKeys', () => {
    it('should extract foreign key constraints', () => {
      const table = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ]);

      const fks = extractor.getForeignKeys(table);

      expect(fks).toHaveLength(1);
      expect(fks[0].columns).toEqual(['user_id']);
      expect(fks[0].referencedTable).toBe('users');
    });

    it('should extract multiple foreign keys', () => {
      const table = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        },
        {
          type: 'FOREIGN_KEY',
          columns: ['product_id'],
          referencedTable: 'products',
          referencedColumns: ['id']
        }
      ]);

      const fks = extractor.getForeignKeys(table);

      expect(fks).toHaveLength(2);
    });
  });

  describe('getUniqueConstraints', () => {
    it('should extract unique constraints', () => {
      const table = createTable('users', [], [
        { type: 'UNIQUE', columns: ['email'] }
      ]);

      const uniques = extractor.getUniqueConstraints(table);

      expect(uniques).toHaveLength(1);
      expect(uniques[0].columns).toEqual(['email']);
    });

    it('should extract composite unique constraints', () => {
      const table = createTable('users', [], [
        { type: 'UNIQUE', columns: ['first_name', 'last_name', 'birth_date'] }
      ]);

      const uniques = extractor.getUniqueConstraints(table);

      expect(uniques).toHaveLength(1);
      expect(uniques[0].columns).toEqual(['first_name', 'last_name', 'birth_date']);
    });
  });

  describe('getCheckConstraints', () => {
    it('should extract check constraints', () => {
      const table = createTable('users', [], [
        { type: 'CHECK', expression: 'age >= 18', columns: ['age'] }
      ]);

      const checks = extractor.getCheckConstraints(table);

      expect(checks).toHaveLength(1);
      expect(checks[0].expression).toBe('age >= 18');
    });
  });

  describe('getNotNullColumns', () => {
    it('should extract not null columns', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false },
        { name: 'phone', type: 'VARCHAR', nullable: true }
      ], []);

      const notNulls = extractor.getNotNullColumns(table);

      expect(notNulls).toEqual(['id', 'email']);
    });
  });

  describe('isPrimaryKeyColumn', () => {
    it('should return true for primary key column', () => {
      const table = createTable('users', [], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      expect(extractor.isPrimaryKeyColumn(table, 'id')).toBe(true);
      expect(extractor.isPrimaryKeyColumn(table, 'name')).toBe(false);
    });
  });

  describe('isForeignKeyColumn', () => {
    it('should return true for foreign key column', () => {
      const table = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ]);

      expect(extractor.isForeignKeyColumn(table, 'user_id')).toBe(true);
      expect(extractor.isForeignKeyColumn(table, 'id')).toBe(false);
    });
  });

  describe('isUniqueColumn', () => {
    it('should return true for unique column', () => {
      const table = createTable('users', [], [
        { type: 'UNIQUE', columns: ['email'] }
      ]);

      expect(extractor.isUniqueColumn(table, 'email')).toBe(true);
      expect(extractor.isUniqueColumn(table, 'name')).toBe(false);
    });
  });

  describe('getForeignKeyReference', () => {
    it('should return foreign key reference for column', () => {
      const fkConstraint: ForeignKeyConstraint = {
        type: 'FOREIGN_KEY',
        columns: ['user_id'],
        referencedTable: 'users',
        referencedColumns: ['id']
      };

      const table = createTable('orders', [], [fkConstraint]);

      const ref = extractor.getForeignKeyReference(table, 'user_id');

      expect(ref).toBeDefined();
      expect(ref?.referencedTable).toBe('users');
    });

    it('should return null if column is not foreign key', () => {
      const table = createTable('orders', [], []);

      const ref = extractor.getForeignKeyReference(table, 'user_id');

      expect(ref).toBeNull();
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build correct dependency graph', () => {
      const users = createTable('users', [], []);
      const products = createTable('products', [], []);
      const orders = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        },
        {
          type: 'FOREIGN_KEY',
          columns: ['product_id'],
          referencedTable: 'products',
          referencedColumns: ['id']
        }
      ]);

      const graph = extractor.buildDependencyGraph([users, products, orders]);

      expect(graph.get('users')).toEqual(new Set());
      expect(graph.get('products')).toEqual(new Set());
      expect(graph.get('orders')).toEqual(new Set(['users', 'products']));
    });
  });

  describe('getGenerationOrder', () => {
    it('should return correct topological order', () => {
      const users = createTable('users', [], []);
      const products = createTable('products', [], []);
      const orders = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        },
        {
          type: 'FOREIGN_KEY',
          columns: ['product_id'],
          referencedTable: 'products',
          referencedColumns: ['id']
        }
      ]);

      const order = extractor.getGenerationOrder([orders, products, users]);

      const usersIndex = order.indexOf('users');
      const productsIndex = order.indexOf('products');
      const ordersIndex = order.indexOf('orders');

      expect(usersIndex).toBeLessThan(ordersIndex);
      expect(productsIndex).toBeLessThan(ordersIndex);
    });

    it('should handle independent tables', () => {
      const users = createTable('users', [], []);
      const products = createTable('products', [], []);

      const order = extractor.getGenerationOrder([users, products]);

      expect(order).toHaveLength(2);
      expect(order).toContain('users');
      expect(order).toContain('products');
    });
  });

  describe('hasSelfReference', () => {
    it('should return true for self-referencing table', () => {
      const employees = createTable('employees', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['manager_id'],
          referencedTable: 'employees',
          referencedColumns: ['id']
        }
      ]);

      expect(extractor.hasSelfReference(employees)).toBe(true);
    });

    it('should return false for non-self-referencing table', () => {
      const orders = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ]);

      expect(extractor.hasSelfReference(orders)).toBe(false);
    });
  });

  describe('getColumn', () => {
    it('should return column definition', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false }
      ], []);

      const column = extractor.getColumn(table, 'email');

      expect(column).toBeDefined();
      expect(column?.name).toBe('email');
      expect(column?.type).toBe('VARCHAR');
    });

    it('should return null if column not found', () => {
      const table = createTable('users', [], []);

      const column = extractor.getColumn(table, 'nonexistent');

      expect(column).toBeNull();
    });
  });

  describe('getReferencingColumns', () => {
    it('should find all columns referencing a table', () => {
      const users = createTable('users', [], []);
      const orders = createTable('orders', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ]);
      const comments = createTable('comments', [], [
        {
          type: 'FOREIGN_KEY',
          columns: ['author_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ]);

      const refs = extractor.getReferencingColumns([users, orders, comments], 'users');

      expect(refs).toHaveLength(2);
      expect(refs[0].table).toBe('orders');
      expect(refs[0].column).toBe('user_id');
      expect(refs[1].table).toBe('comments');
      expect(refs[1].column).toBe('author_id');
    });
  });
});
