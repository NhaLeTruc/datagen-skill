import { GenerationEngine } from '../../src/core/generator/engine';
import { TableSchema, ColumnSchema, ForeignKeyConstraint } from '../../src/types';

describe('DependencyGraph', () => {
  describe('buildDependencyGraph', () => {
    it('builds correct graph for simple FK relationship', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'user_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id'
          }]
        }
      ];

      const engine = new GenerationEngine(tables, { count: 10, seed: 42 });
      const order = (engine as any).buildDependencyOrder();

      expect(order.indexOf('users')).toBeLessThan(order.indexOf('orders'));
    });

    it('handles three-level dependency chain', () => {
      const tables: TableSchema[] = [
        {
          name: 'countries',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'states',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'country_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'country_id',
            referencedTable: 'countries',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'cities',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'state_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'state_id',
            referencedTable: 'states',
            referencedColumn: 'id'
          }]
        }
      ];

      const engine = new GenerationEngine(tables, { count: 10, seed: 42 });
      const order = (engine as any).buildDependencyOrder();

      expect(order.indexOf('countries')).toBeLessThan(order.indexOf('states'));
      expect(order.indexOf('states')).toBeLessThan(order.indexOf('cities'));
    });

    it('handles tables with no dependencies', () => {
      const tables: TableSchema[] = [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const engine = new GenerationEngine(tables, { count: 10, seed: 42 });
      const order = (engine as any).buildDependencyOrder();

      expect(order).toHaveLength(2);
      expect(order).toContain('products');
      expect(order).toContain('categories');
    });

    it('handles multiple foreign keys to same table', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'messages',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'sender_id', type: 'INTEGER', constraints: {} },
            { name: 'receiver_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [
            {
              columnName: 'sender_id',
              referencedTable: 'users',
              referencedColumn: 'id'
            },
            {
              columnName: 'receiver_id',
              referencedTable: 'users',
              referencedColumn: 'id'
            }
          ]
        }
      ];

      const engine = new GenerationEngine(tables, { count: 10, seed: 42 });
      const order = (engine as any).buildDependencyOrder();

      expect(order.indexOf('users')).toBeLessThan(order.indexOf('messages'));
    });

    it('handles complex dependency graph with multiple branches', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'user_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'order_items',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'order_id', type: 'INTEGER', constraints: {} },
            { name: 'product_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [
            {
              columnName: 'order_id',
              referencedTable: 'orders',
              referencedColumn: 'id'
            },
            {
              columnName: 'product_id',
              referencedTable: 'products',
              referencedColumn: 'id'
            }
          ]
        }
      ];

      const engine = new GenerationEngine(tables, { count: 10, seed: 42 });
      const order = (engine as any).buildDependencyOrder();

      // Users and products can be in any order, but both before orders
      const usersIndex = order.indexOf('users');
      const productsIndex = order.indexOf('products');
      const ordersIndex = order.indexOf('orders');
      const orderItemsIndex = order.indexOf('order_items');

      expect(usersIndex).toBeLessThan(ordersIndex);
      expect(productsIndex).toBeLessThan(orderItemsIndex);
      expect(ordersIndex).toBeLessThan(orderItemsIndex);
    });
  });

  describe('detectCircularDependencies', () => {
    it('detects direct circular dependency', () => {
      const tables: TableSchema[] = [
        {
          name: 'table_a',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'b_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'b_id',
            referencedTable: 'table_b',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'table_b',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'a_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'a_id',
            referencedTable: 'table_a',
            referencedColumn: 'id'
          }]
        }
      ];

      expect(() => {
        new GenerationEngine(tables, { count: 10, seed: 42 });
      }).toThrow();
    });

    it('detects indirect circular dependency', () => {
      const tables: TableSchema[] = [
        {
          name: 'table_a',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'b_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'b_id',
            referencedTable: 'table_b',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'table_b',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'c_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'c_id',
            referencedTable: 'table_c',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'table_c',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'a_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'a_id',
            referencedTable: 'table_a',
            referencedColumn: 'id'
          }]
        }
      ];

      expect(() => {
        new GenerationEngine(tables, { count: 10, seed: 42 });
      }).toThrow();
    });
  });
});
