import { CircularDependencyResolver } from '../../src/core/generator/circular-dependency-resolver';
import { TableSchema } from '../../src/types';

describe('CircularDependencyResolver', () => {
  describe('detection', () => {
    it('detects simple circular dependency', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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

      const resolver = new CircularDependencyResolver(tables);
      expect(resolver.hasCircularDependencies()).toBe(true);
    });

    it('detects three-way circular dependency', () => {
      const tables: TableSchema[] = [
        {
          name: 'a',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'b_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'b_id',
            referencedTable: 'b',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'b',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'c_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'c_id',
            referencedTable: 'c',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'c',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'a_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'a_id',
            referencedTable: 'a',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      expect(resolver.hasCircularDependencies()).toBe(true);
    });

    it('does not detect false circular dependency in linear chain', () => {
      const tables: TableSchema[] = [
        {
          name: 'a',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        },
        {
          name: 'b',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'a_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'a_id',
            referencedTable: 'a',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'c',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'b_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'b_id',
            referencedTable: 'b',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      expect(resolver.hasCircularDependencies()).toBe(false);
    });
  });

  describe('resolution strategy', () => {
    it('breaks cycle by making one FK nullable', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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

      const resolver = new CircularDependencyResolver(tables);
      const strategy = resolver.resolveCircularDependencies();

      expect(strategy).toBeDefined();
      expect(strategy.deferredForeignKeys).toHaveLength(1);
    });

    it('identifies which FK to defer', () => {
      const tables: TableSchema[] = [
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'latest_shipment_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'latest_shipment_id',
            referencedTable: 'shipments',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'shipments',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'order_id', type: 'INTEGER', constraints: { notNull: true } }
          ],
          foreignKeys: [{
            columnName: 'order_id',
            referencedTable: 'orders',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      const strategy = resolver.resolveCircularDependencies();

      // Should defer the nullable FK (latest_shipment_id)
      expect(strategy.deferredForeignKeys[0].columnName).toBe('latest_shipment_id');
    });

    it('generates records with deferred FK initially null', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'name', type: 'VARCHAR(100)', constraints: {} },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'bio', type: 'TEXT', constraints: {} },
            { name: 'user_id', type: 'INTEGER', constraints: {} }
          ],
          foreignKeys: [{
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      const result = resolver.generateWithDeferredFKs(10);

      // Initial pass: users have null profile_id
      expect(result.users.every((u: any) => u.profile_id === null)).toBe(true);

      // Profiles should have valid user_id
      expect(result.profiles.every((p: any) => p.user_id !== null)).toBe(true);
    });

    it('updates deferred FKs in second pass', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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

      const resolver = new CircularDependencyResolver(tables);
      const result = resolver.generateWithDeferredFKs(10);

      // After update pass, users should have profile_id populated
      const usersAfterUpdate = resolver.updateDeferredFKs(result);
      expect(usersAfterUpdate.users.some((u: any) => u.profile_id !== null)).toBe(true);

      // Verify referential integrity
      const profileIds = new Set(result.profiles.map((p: any) => p.id));
      usersAfterUpdate.users.forEach((user: any) => {
        if (user.profile_id !== null) {
          expect(profileIds.has(user.profile_id)).toBe(true);
        }
      });
    });
  });

  describe('complex cycles', () => {
    it('handles multiple cycles in same schema', () => {
      const tables: TableSchema[] = [
        // Cycle 1: users <-> profiles
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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
        // Cycle 2: products <-> categories
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'featured_category_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'featured_category_id',
            referencedTable: 'categories',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'featured_product_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'featured_product_id',
            referencedTable: 'products',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      expect(resolver.hasCircularDependencies()).toBe(true);

      const strategy = resolver.resolveCircularDependencies();
      expect(strategy.deferredForeignKeys.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('throws error if cycle cannot be broken', () => {
      // Both FKs are NOT NULL - impossible to resolve
      const tables: TableSchema[] = [
        {
          name: 'a',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'b_id', type: 'INTEGER', constraints: { notNull: true } }
          ],
          foreignKeys: [{
            columnName: 'b_id',
            referencedTable: 'b',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'b',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'a_id', type: 'INTEGER', constraints: { notNull: true } }
          ],
          foreignKeys: [{
            columnName: 'a_id',
            referencedTable: 'a',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      expect(() => resolver.resolveCircularDependencies()).toThrow();
    });
  });

  describe('generation order', () => {
    it('provides correct generation order for circular dependencies', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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

      const resolver = new CircularDependencyResolver(tables);
      const order = resolver.getGenerationOrder();

      expect(order).toBeDefined();
      expect(order).toHaveLength(2);

      // The table with deferred FK should come first
      expect(order[0]).toBe('users');
      expect(order[1]).toBe('profiles');
    });
  });

  describe('referential integrity validation', () => {
    it('validates all FKs after deferred update', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'profile_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'profile_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }]
        },
        {
          name: 'profiles',
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

      const resolver = new CircularDependencyResolver(tables);
      const result = resolver.generateWithDeferredFKs(20);
      const updated = resolver.updateDeferredFKs(result);

      // Validate referential integrity
      const isValid = resolver.validateReferentialIntegrity(updated);
      expect(isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles single table with no dependencies', () => {
      const tables: TableSchema[] = [
        {
          name: 'standalone',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const resolver = new CircularDependencyResolver(tables);
      expect(resolver.hasCircularDependencies()).toBe(false);
    });

    it('handles self-referencing table (not a circular dependency)', () => {
      const tables: TableSchema[] = [
        {
          name: 'employees',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'manager_id', type: 'INTEGER', constraints: { notNull: false } }
          ],
          foreignKeys: [{
            columnName: 'manager_id',
            referencedTable: 'employees',
            referencedColumn: 'id'
          }]
        }
      ];

      const resolver = new CircularDependencyResolver(tables);

      // Self-referencing is not a circular dependency between tables
      expect(resolver.hasCircularDependencies()).toBe(false);
    });
  });
});
