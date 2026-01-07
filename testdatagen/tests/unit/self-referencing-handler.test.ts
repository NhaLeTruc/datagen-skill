import { SelfReferencingHandler } from '../../src/core/generator/self-referencing-handler';
import { ValueGenerator } from '../../src/core/generator/value-generator';
import { TableSchema } from '../../src/types';

describe('SelfReferencingHandler', () => {
  let valueGenerator: ValueGenerator;

  beforeEach(() => {
    valueGenerator = new ValueGenerator(12345);
  });

  describe('detectSelfReferencing', () => {
    it('detects self-referencing foreign key', () => {
      const table: TableSchema = {
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
      };

      const handler = new SelfReferencingHandler(valueGenerator);
      expect(handler.hasSelfReference(table)).toBe(true);
    });

    it('does not detect non-self-referencing foreign key', () => {
      const table: TableSchema = {
        name: 'orders',
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
      };

      const handler = new SelfReferencingHandler(valueGenerator);
      expect(handler.hasSelfReference(table)).toBe(false);
    });

    it('handles multiple self-referencing columns', () => {
      const table: TableSchema = {
        name: 'nodes',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true },
          { name: 'previous_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'nodes',
            referencedColumns: ['id']
          },
          {
            type: 'FOREIGN_KEY',
            columns: ['previous_id'],
            referencedTable: 'nodes',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator);
      expect(handler.hasSelfReference(table)).toBe(true);

      const selfRefs = handler.identifySelfReferences(table);
      expect(selfRefs.length).toBe(2);
    });
  });

  describe('tiered generation', () => {
    it('generates root nodes without references', async () => {
      const table: TableSchema = {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'categories',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 3 });
      const tieredRecords = await handler.generateTieredRecords(table, 10);

      expect(tieredRecords.length).toBeGreaterThan(0);

      const rootRecords = tieredRecords.filter(tr => tr.tier === 0);
      expect(rootRecords.length).toBeGreaterThan(0);

      rootRecords.forEach(tr => {
        expect(tr.record.parent_id).toBeNull();
      });
    });

    it('generates child nodes with valid parent references', async () => {
      const table: TableSchema = {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'categories',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 3 });
      const tieredRecords = await handler.generateTieredRecords(table, 20);

      expect(tieredRecords.length).toBe(20);

      const allIds = new Set(tieredRecords.map(tr => tr.record.id));

      const childRecords = tieredRecords.filter(tr => tr.tier > 0);
      childRecords.forEach(tr => {
        if (tr.record.parent_id !== null) {
          expect(allIds.has(tr.record.parent_id)).toBe(true);
        }
      });
    });

    it('generates multiple tiers correctly', async () => {
      const table: TableSchema = {
        name: 'org_units',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'org_units',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 3 });
      const tieredRecords = await handler.generateTieredRecords(table, 50);

      expect(tieredRecords.length).toBe(50);

      const stats = handler.getTierStatistics(tieredRecords);
      expect(stats.totalTiers).toBeGreaterThan(1);
      expect(stats.rootRecords).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('tier statistics', () => {
    it('calculates tier statistics correctly', async () => {
      const table: TableSchema = {
        name: 'tree',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'tree',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 4 });
      const tieredRecords = await handler.generateTieredRecords(table, 100);

      const stats = handler.getTierStatistics(tieredRecords);

      expect(stats.totalTiers).toBeGreaterThan(0);
      expect(stats.totalTiers).toBeLessThanOrEqual(4);
      expect(stats.rootRecords).toBeGreaterThan(0);

      let totalRecords = 0;
      stats.recordsPerTier.forEach(count => {
        totalRecords += count;
      });
      expect(totalRecords).toBe(100);
    });
  });

  describe('validation', () => {
    it('validates tiered records for referential integrity', async () => {
      const table: TableSchema = {
        name: 'comments',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'text', type: 'TEXT', nullable: false },
          { name: 'reply_to_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['reply_to_id'],
            referencedTable: 'comments',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator);
      const tieredRecords = await handler.generateTieredRecords(table, 30);

      const selfRefConstraints = handler.identifySelfReferences(table);
      const validation = handler.validateTieredRecords(tieredRecords, selfRefConstraints);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('detects invalid references', () => {
      const tieredRecords = [
        { tier: 0, record: { id: 1, parent_id: null } },
        { tier: 1, record: { id: 2, parent_id: 1 } },
        { tier: 2, record: { id: 3, parent_id: 999 } } // Invalid reference
      ];

      const handler = new SelfReferencingHandler(valueGenerator);
      const selfRefConstraints = [
        {
          type: 'FOREIGN_KEY' as const,
          columns: ['parent_id'],
          referencedTable: 'test',
          referencedColumns: ['id']
        }
      ];

      const validation = handler.validateTieredRecords(tieredRecords, selfRefConstraints);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('non-existent');
    });

    it('detects tier order violations', () => {
      const tieredRecords = [
        { tier: 0, record: { id: 1, parent_id: null } },
        { tier: 1, record: { id: 2, parent_id: 3 } }, // References higher tier
        { tier: 2, record: { id: 3, parent_id: 1 } }
      ];

      const handler = new SelfReferencingHandler(valueGenerator);
      const selfRefConstraints = [
        {
          type: 'FOREIGN_KEY' as const,
          columns: ['parent_id'],
          referencedTable: 'test',
          referencedColumns: ['id']
        }
      ];

      const validation = handler.validateTieredRecords(tieredRecords, selfRefConstraints);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.includes('same or higher tier'))).toBe(true);
    });

    it('detects root records with non-null references', () => {
      const tieredRecords = [
        { tier: 0, record: { id: 1, parent_id: 2 } }, // Root should have null parent
        { tier: 1, record: { id: 2, parent_id: 1 } }
      ];

      const handler = new SelfReferencingHandler(valueGenerator);
      const selfRefConstraints = [
        {
          type: 'FOREIGN_KEY' as const,
          columns: ['parent_id'],
          referencedTable: 'test',
          referencedColumns: ['id']
        }
      ];

      const validation = handler.validateTieredRecords(tieredRecords, selfRefConstraints);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.includes('Root record'))).toBe(true);
    });
  });

  describe('configuration', () => {
    it('respects maxDepth configuration', async () => {
      const table: TableSchema = {
        name: 'hierarchy',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'hierarchy',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 3 });
      const tieredRecords = await handler.generateTieredRecords(table, 100);

      const stats = handler.getTierStatistics(tieredRecords);
      expect(stats.maxDepth).toBeLessThanOrEqual(2); // 0-indexed, so maxDepth of 3 means tiers 0, 1, 2
    });

    it('respects nullPercentage configuration', async () => {
      const table: TableSchema = {
        name: 'items',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'items',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, {
        maxDepth: 3,
        nullPercentage: 50
      });

      const tieredRecords = await handler.generateTieredRecords(table, 100);

      const nonRootRecords = tieredRecords.filter(tr => tr.tier > 0);
      const nullCount = nonRootRecords.filter(tr => tr.record.parent_id === null).length;

      if (nonRootRecords.length > 0) {
        const nullPercent = (nullCount / nonRootRecords.length) * 100;
        expect(nullPercent).toBeGreaterThan(0);
        expect(nullPercent).toBeLessThan(100);
      }
    });
  });

  describe('edge cases', () => {
    it('handles single record generation', async () => {
      const table: TableSchema = {
        name: 'singleton',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'singleton',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator);
      const tieredRecords = await handler.generateTieredRecords(table, 1);

      expect(tieredRecords).toHaveLength(1);
      expect(tieredRecords[0].tier).toBe(0);
      expect(tieredRecords[0].record.parent_id).toBeNull();
    });

    it('throws error for non-self-referencing table', async () => {
      const table: TableSchema = {
        name: 'simple',
        columns: [{ name: 'id', type: 'INTEGER', nullable: false }],
        constraints: [{ type: 'PRIMARY_KEY', columns: ['id'] }]
      };

      const handler = new SelfReferencingHandler(valueGenerator);

      await expect(handler.generateTieredRecords(table, 10)).rejects.toThrow();
    });

    it('maintains unique IDs across tiers', async () => {
      const table: TableSchema = {
        name: 'tree',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          {
            type: 'FOREIGN_KEY',
            columns: ['parent_id'],
            referencedTable: 'tree',
            referencedColumns: ['id']
          }
        ]
      };

      const handler = new SelfReferencingHandler(valueGenerator, { maxDepth: 4 });
      const tieredRecords = await handler.generateTieredRecords(table, 60);

      const allIds = tieredRecords.map(tr => tr.record.id);
      const uniqueIds = new Set(allIds);

      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
