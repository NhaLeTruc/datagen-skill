import { CircularDependencyResolver } from '../../src/core/generator/circular-dependency-resolver';
import { SchemaDefinition, TableSchema, ForeignKeyConstraint } from '../../src/types';

describe('CircularDependencyResolver', () => {
  describe('detection', () => {
    it('detects simple circular dependency', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'profile_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['profile_id'],
                referencedTable: 'profiles',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['user_id'],
                referencedTable: 'users',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].cycle).toContain('users');
      expect(cycles[0].cycle).toContain('profiles');
    });

    it('detects three-way circular dependency', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'a',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'b_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['b_id'],
                referencedTable: 'b',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'b',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'c_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['c_id'],
                referencedTable: 'c',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'c',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'a_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['a_id'],
                referencedTable: 'a',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].cycle).toContain('a');
      expect(cycles[0].cycle).toContain('b');
      expect(cycles[0].cycle).toContain('c');
    });

    it('does not detect false circular dependency in linear chain', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'a',
            columns: [{ name: 'id', type: 'INTEGER', nullable: false }],
            constraints: [{ type: 'PRIMARY_KEY', columns: ['id'] }]
          },
          {
            name: 'b',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'a_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['a_id'],
                referencedTable: 'a',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'c',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'b_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['b_id'],
                referencedTable: 'b',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBe(0);
    });
  });

  describe('resolution strategy', () => {
    it('determines nullable strategy when FK is nullable', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'profile_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['profile_id'],
                referencedTable: 'profiles',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['user_id'],
                referencedTable: 'users',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);

      const strategy = resolver.determineResolutionStrategy(cycles[0]);
      expect(strategy.type).toBe('nullable');
      expect(strategy.affectedTables).toContain('users');
    });

    it('determines two-pass strategy when no nullable FKs', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'a',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'b_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['b_id'],
                referencedTable: 'b',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'b',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'a_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['a_id'],
                referencedTable: 'a',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);

      const strategy = resolver.determineResolutionStrategy(cycles[0]);
      expect(strategy.type).toBe('two-pass');
    });
  });

  describe('generation order', () => {
    it('provides correct generation order resolving circular dependencies', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'profile_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['profile_id'],
                referencedTable: 'profiles',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['user_id'],
                referencedTable: 'users',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const order = resolver.resolveGenerationOrder();

      expect(order).toBeDefined();
      expect(order.length).toBeGreaterThan(0);
      expect(order).toContain('users');
      expect(order).toContain('profiles');
    });

    it('handles multiple independent cycles', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'profile_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['profile_id'],
                referencedTable: 'profiles',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['user_id'],
                referencedTable: 'users',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'products',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'category_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['category_id'],
                referencedTable: 'categories',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'categories',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'featured_product_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['featured_product_id'],
                referencedTable: 'products',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThanOrEqual(2);

      const order = resolver.resolveGenerationOrder();
      expect(order).toBeDefined();
      expect(order.length).toBe(4);
    });
  });

  describe('two-pass plan', () => {
    it('creates two-pass plan with phase separation', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'name', type: 'VARCHAR', nullable: false },
              { name: 'profile_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['profile_id'],
                referencedTable: 'profiles',
                referencedColumns: ['id']
              }
            ]
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'bio', type: 'TEXT', nullable: true },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['user_id'],
                referencedTable: 'users',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);

      const plan = resolver.createTwoPassPlan(cycles[0]);

      expect(plan.phase1.length).toBeGreaterThan(0);
      expect(plan.phase2.length).toBeGreaterThan(0);

      // Verify phase1 excludes cyclic FK columns
      const usersPhase1 = plan.phase1.find(p => p.table === 'users');
      expect(usersPhase1).toBeDefined();
      expect(usersPhase1?.columns).toContain('id');
      expect(usersPhase1?.columns).toContain('name');

      // Verify phase2 includes cyclic FK columns for updates
      const usersPhase2 = plan.phase2.find(p => p.table === 'users');
      if (usersPhase2) {
        expect(usersPhase2.updates).toContain('profile_id');
      }
    });
  });

  describe('edge cases', () => {
    it('handles schema with no circular dependencies', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'standalone',
            columns: [{ name: 'id', type: 'INTEGER', nullable: false }],
            constraints: [{ type: 'PRIMARY_KEY', columns: ['id'] }]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBe(0);
    });

    it('handles self-referencing table correctly', () => {
      const schema: SchemaDefinition = {
        tables: [
          {
            name: 'employees',
            columns: [
              { name: 'id', type: 'INTEGER', nullable: false },
              { name: 'manager_id', type: 'INTEGER', nullable: true }
            ],
            constraints: [
              { type: 'PRIMARY_KEY', columns: ['id'] },
              {
                type: 'FOREIGN_KEY',
                columns: ['manager_id'],
                referencedTable: 'employees',
                referencedColumns: ['id']
              }
            ]
          }
        ]
      };

      const resolver = new CircularDependencyResolver(schema);
      const cycles = resolver.detectCircularDependencies();

      // Self-referencing should not create a circular dependency cycle
      // because it's within the same table
      expect(cycles.length).toBe(0);
    });
  });
});
