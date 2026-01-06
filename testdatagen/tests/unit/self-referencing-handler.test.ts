import { SelfReferencingHandler } from '../../src/core/generator/self-referencing-handler';
import { TableSchema, ColumnSchema } from '../../src/types';

describe('SelfReferencingHandler', () => {
  describe('detectSelfReferencing', () => {
    it('detects self-referencing foreign key', () => {
      const table: TableSchema = {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'manager_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'manager_id',
          referencedTable: 'employees',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      expect(handler.isSelfReferencing()).toBe(true);
    });

    it('does not detect non-self-referencing foreign key', () => {
      const table: TableSchema = {
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
      };

      const handler = new SelfReferencingHandler(table);
      expect(handler.isSelfReferencing()).toBe(false);
    });

    it('handles multiple self-referencing columns', () => {
      const table: TableSchema = {
        name: 'nodes',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} },
          { name: 'previous_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [
          {
            columnName: 'parent_id',
            referencedTable: 'nodes',
            referencedColumn: 'id'
          },
          {
            columnName: 'previous_id',
            referencedTable: 'nodes',
            referencedColumn: 'id'
          }
        ]
      };

      const handler = new SelfReferencingHandler(table);
      expect(handler.isSelfReferencing()).toBe(true);
    });
  });

  describe('tiered generation', () => {
    it('generates root nodes without references', () => {
      const table: TableSchema = {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'name', type: 'VARCHAR(100)', constraints: {} },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'categories',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const rootRecords = handler.generateTier(0, 10, []);

      expect(rootRecords).toHaveLength(10);
      rootRecords.forEach(record => {
        expect(record.parent_id).toBeNull();
      });
    });

    it('generates child nodes with valid parent references', () => {
      const table: TableSchema = {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'name', type: 'VARCHAR(100)', constraints: {} },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'categories',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      // Generate root tier
      const rootRecords = handler.generateTier(0, 5, []);
      const rootIds = rootRecords.map(r => r.id);

      // Generate child tier
      const childRecords = handler.generateTier(1, 10, rootIds);

      expect(childRecords).toHaveLength(10);
      childRecords.forEach(record => {
        expect(rootIds).toContain(record.parent_id);
      });
    });

    it('generates multiple tiers correctly', () => {
      const table: TableSchema = {
        name: 'org_units',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'name', type: 'VARCHAR(100)', constraints: {} },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'org_units',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      // Tier 0: Root
      const tier0 = handler.generateTier(0, 3, []);
      expect(tier0).toHaveLength(3);
      expect(tier0.every(r => r.parent_id === null)).toBe(true);

      // Tier 1: Children of root
      const tier0Ids = tier0.map(r => r.id);
      const tier1 = handler.generateTier(1, 9, tier0Ids);
      expect(tier1).toHaveLength(9);
      expect(tier1.every(r => tier0Ids.includes(r.parent_id))).toBe(true);

      // Tier 2: Grandchildren
      const tier1Ids = tier1.map(r => r.id);
      const tier2 = handler.generateTier(2, 27, tier1Ids);
      expect(tier2).toHaveLength(27);
      expect(tier2.every(r => tier1Ids.includes(r.parent_id))).toBe(true);
    });
  });

  describe('tier distribution', () => {
    it('calculates tier sizes for balanced tree', () => {
      const table: TableSchema = {
        name: 'tree',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'tree',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const distribution = handler.calculateTierDistribution(100, 3);

      expect(distribution).toHaveLength(3);
      expect(distribution.reduce((a, b) => a + b, 0)).toBe(100);
      expect(distribution[0]).toBeGreaterThan(0); // Root tier has records
      expect(distribution[distribution.length - 1]).toBeGreaterThan(0); // Leaf tier has records
    });

    it('handles single tier (all roots)', () => {
      const table: TableSchema = {
        name: 'items',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'items',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const distribution = handler.calculateTierDistribution(50, 1);

      expect(distribution).toHaveLength(1);
      expect(distribution[0]).toBe(50);
    });

    it('handles deep hierarchy', () => {
      const table: TableSchema = {
        name: 'nodes',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'nodes',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const distribution = handler.calculateTierDistribution(1000, 5);

      expect(distribution).toHaveLength(5);
      expect(distribution.reduce((a, b) => a + b, 0)).toBe(1000);

      // First tier should have fewer records than later tiers in typical tree
      expect(distribution[0]).toBeLessThan(distribution[distribution.length - 1]);
    });
  });

  describe('nullable self-references', () => {
    it('allows nullable parent references', () => {
      const table: TableSchema = {
        name: 'pages',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'title', type: 'VARCHAR(200)', constraints: {} },
          { name: 'parent_page_id', type: 'INTEGER', constraints: { notNull: false } }
        ],
        foreignKeys: [{
          columnName: 'parent_page_id',
          referencedTable: 'pages',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const records = handler.generateTier(0, 20, []);

      expect(records).toHaveLength(20);
      // Root tier should have null parent references
      expect(records.every(r => r.parent_page_id === null)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty parent pool', () => {
      const table: TableSchema = {
        name: 'items',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'items',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      // Attempting tier 1 with no parents should default to root-like behavior
      const records = handler.generateTier(1, 5, []);
      expect(records).toHaveLength(5);
    });

    it('handles single record generation', () => {
      const table: TableSchema = {
        name: 'singleton',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'singleton',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);
      const records = handler.generateTier(0, 1, []);

      expect(records).toHaveLength(1);
      expect(records[0].parent_id).toBeNull();
    });

    it('maintains referential integrity across all tiers', () => {
      const table: TableSchema = {
        name: 'comments',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'text', type: 'TEXT', constraints: {} },
          { name: 'reply_to_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'reply_to_id',
          referencedTable: 'comments',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      const allRecords: any[] = [];
      let currentTierIds: number[] = [];

      // Generate 4 tiers
      for (let tier = 0; tier < 4; tier++) {
        const tierRecords = handler.generateTier(tier, 10, currentTierIds);
        allRecords.push(...tierRecords);
        currentTierIds = tierRecords.map(r => r.id);
      }

      // Verify all non-null reply_to_id values exist in the record set
      const allIds = new Set(allRecords.map(r => r.id));
      allRecords.forEach(record => {
        if (record.reply_to_id !== null) {
          expect(allIds.has(record.reply_to_id)).toBe(true);
        }
      });
    });
  });

  describe('performance', () => {
    it('handles large tier generation efficiently', () => {
      const table: TableSchema = {
        name: 'large_tree',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'large_tree',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      const startTime = Date.now();
      const rootRecords = handler.generateTier(0, 100, []);
      const rootIds = rootRecords.map(r => r.id);
      const childRecords = handler.generateTier(1, 1000, rootIds);
      const endTime = Date.now();

      expect(rootRecords).toHaveLength(100);
      expect(childRecords).toHaveLength(1000);

      // Should complete reasonably quickly (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('consistent ID generation', () => {
    it('generates unique IDs across tiers', () => {
      const table: TableSchema = {
        name: 'hierarchy',
        columns: [
          { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
          { name: 'parent_id', type: 'INTEGER', constraints: {} }
        ],
        foreignKeys: [{
          columnName: 'parent_id',
          referencedTable: 'hierarchy',
          referencedColumn: 'id'
        }]
      };

      const handler = new SelfReferencingHandler(table);

      const tier0 = handler.generateTier(0, 10, []);
      const tier1 = handler.generateTier(1, 20, tier0.map(r => r.id));
      const tier2 = handler.generateTier(2, 30, tier1.map(r => r.id));

      const allIds = [
        ...tier0.map(r => r.id),
        ...tier1.map(r => r.id),
        ...tier2.map(r => r.id)
      ];

      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
