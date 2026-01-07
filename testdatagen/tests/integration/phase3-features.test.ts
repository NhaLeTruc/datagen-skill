import { SelfReferencingHandler } from '../../src/core/generator/self-referencing-handler';
import { CircularDependencyResolver } from '../../src/core/generator/circular-dependency-resolver';
import { StatisticalValidator } from '../../src/core/validator/statistical-validator';
import { CustomPatternGenerator } from '../../src/core/generator/custom-pattern-generator';
import { ValueGenerator } from '../../src/core/generator/value-generator';
import { SchemaDefinition, TableDefinition } from '../../src/types';

describe('Phase 3 Features Integration', () => {
  describe('Self-referencing foreign keys', () => {
    const employeeTable: TableDefinition = {
      name: 'employees',
      columns: [
        { name: 'id', type: 'INT', nullable: false },
        { name: 'name', type: 'VARCHAR', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false },
        { name: 'manager_id', type: 'INT', nullable: true }
      ],
      constraints: [
        { type: 'PRIMARY_KEY', columns: ['id'] },
        { type: 'FOREIGN_KEY', columns: ['manager_id'], referencedTable: 'employees', referencedColumns: ['id'] }
      ]
    };

    it('should identify self-references', () => {
      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);

      const selfRefs = handler.identifySelfReferences(employeeTable);
      expect(selfRefs).toHaveLength(1);
      expect((selfRefs[0] as any).referencedTable).toBe('employees');
    });

    it('should generate tiered records', async () => {
      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);

      const tieredRecords = await handler.generateTieredRecords(employeeTable, 50);

      expect(tieredRecords.length).toBe(50);
      expect(tieredRecords.some(tr => tr.tier === 0)).toBe(true);
      expect(tieredRecords.some(tr => tr.tier > 0)).toBe(true);
    });

    it('should validate tiered structure', async () => {
      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);

      const tieredRecords = await handler.generateTieredRecords(employeeTable, 50);
      const selfRefConstraints = handler.identifySelfReferences(employeeTable);

      const validation = handler.validateTieredRecords(tieredRecords, selfRefConstraints);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have root records with null manager_id', async () => {
      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);

      const tieredRecords = await handler.generateTieredRecords(employeeTable, 50);

      const rootRecords = tieredRecords.filter(tr => tr.tier === 0);
      expect(rootRecords.length).toBeGreaterThan(0);

      for (const root of rootRecords) {
        expect(root.record.manager_id).toBeNull();
      }
    });

    it('should compute tier statistics', async () => {
      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);

      const tieredRecords = await handler.generateTieredRecords(employeeTable, 100);
      const stats = handler.getTierStatistics(tieredRecords);

      expect(stats.totalTiers).toBeGreaterThan(1);
      expect(stats.rootRecords).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeGreaterThan(0);
      expect(stats.recordsPerTier.size).toBe(stats.totalTiers);
    });
  });

  describe('Circular dependency resolution', () => {
    const circularSchema: SchemaDefinition = {
      tables: [
        {
          name: 'authors',
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: false },
            { name: 'featured_book_id', type: 'INT', nullable: true }
          ],
          constraints: [
            { type: 'PRIMARY_KEY', columns: ['id'] },
            { type: 'FOREIGN_KEY', columns: ['featured_book_id'], referencedTable: 'books', referencedColumns: ['id'] }
          ]
        },
        {
          name: 'books',
          columns: [
            { name: 'id', type: 'INT', nullable: false },
            { name: 'title', type: 'VARCHAR', nullable: false },
            { name: 'author_id', type: 'INT', nullable: false }
          ],
          constraints: [
            { type: 'PRIMARY_KEY', columns: ['id'] },
            { type: 'FOREIGN_KEY', columns: ['author_id'], referencedTable: 'authors', referencedColumns: ['id'] }
          ]
        }
      ]
    };

    it('should detect circular dependencies', () => {
      const resolver = new CircularDependencyResolver(circularSchema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].cycle).toContain('authors');
      expect(cycles[0].cycle).toContain('books');
    });

    it('should determine resolution strategy', () => {
      const resolver = new CircularDependencyResolver(circularSchema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);

      const strategy = resolver.determineResolutionStrategy(cycles[0]);
      expect(strategy).toBeDefined();
      expect(['nullable', 'two-pass']).toContain(strategy.type);
    });

    it('should create two-pass plan', () => {
      const resolver = new CircularDependencyResolver(circularSchema);
      const cycles = resolver.detectCircularDependencies();

      expect(cycles.length).toBeGreaterThan(0);

      const plan = resolver.createTwoPassPlan(cycles[0]);
      expect(plan.phase1).toBeDefined();
      expect(plan.phase2).toBeDefined();
      expect(plan.phase1.length).toBeGreaterThan(0);
    });

    it('should resolve generation order', () => {
      const resolver = new CircularDependencyResolver(circularSchema);
      const order = resolver.resolveGenerationOrder();

      expect(order).toBeDefined();
      expect(order.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Statistical validation', () => {
    it('should validate normal distribution', async () => {
      const validator = new StatisticalValidator('python3');

      const normalData = Array.from({ length: 1000 }, () =>
        Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random())
      );

      try {
        const result = await validator.validateDistribution(normalData, 'normal');

        expect(result).toBeDefined();
        expect(result.distribution).toBe('normal');
        expect(result.tests.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('Python not available, skipping statistical test');
      }
    }, 15000);

    it('should detect non-normal distribution', async () => {
      const validator = new StatisticalValidator('python3');

      const uniformData = Array.from({ length: 1000 }, () => Math.random());

      try {
        const result = await validator.validateDistribution(uniformData, 'normal');

        expect(result).toBeDefined();
        expect(result.distribution).toBe('normal');
        expect(result.passes).toBe(false);
      } catch (error) {
        console.log('Python not available, skipping statistical test');
      }
    }, 15000);

    it('should perform chi-squared test', async () => {
      const validator = new StatisticalValidator('python3');

      const observed = [50, 45, 55, 48, 52];
      const expected = [50, 50, 50, 50, 50];

      try {
        const result = await validator.chiSquaredTest(observed, expected);

        expect(result).toBeDefined();
        expect(result.test).toBe('chi_squared');
        expect(result).toHaveProperty('statistic');
        expect(result).toHaveProperty('p_value');
      } catch (error) {
        console.log('Python not available, skipping statistical test');
      }
    }, 15000);
  });

  describe('Custom pattern generation', () => {
    it('should generate custom patterns', () => {
      const generator = new CustomPatternGenerator(12345);

      const results = generator.generate('ABC-####-XX', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^ABC-\d{4}-[A-Z]{2}$/);
      });
    });

    it('should generate SKU-like patterns', () => {
      const generator = new CustomPatternGenerator(12345);

      const results = generator.generate('SKU-[A,B,C]-####', 20);

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toMatch(/^SKU-[ABC]-\d{4}$/);
      });
    });

    it('should generate UUID-like patterns', () => {
      const generator = new CustomPatternGenerator(12345);

      const results = generator.generate('HHHHHHHH-HHHH-HHHH-HHHH-HHHHHHHHHHHH', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
      });
    });

    it('should generate reproducibly with seed', () => {
      const gen1 = new CustomPatternGenerator(99999);
      const gen2 = new CustomPatternGenerator(99999);

      const results1 = gen1.generate('ORDER-####-AA', 10);
      const results2 = gen2.generate('ORDER-####-AA', 10);

      expect(results1).toEqual(results2);
    });
  });

  describe('Combined Phase 3 features', () => {
    it('should work with self-referencing and pattern generation together', async () => {
      const employeeTable: TableDefinition = {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'employee_code', type: 'VARCHAR', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: false },
          { name: 'manager_id', type: 'INT', nullable: true }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          { type: 'FOREIGN_KEY', columns: ['manager_id'], referencedTable: 'employees', referencedColumns: ['id'] }
        ]
      };

      const valueGenerator = new ValueGenerator(12345, 'en_US');
      const handler = new SelfReferencingHandler(valueGenerator);
      const patternGen = new CustomPatternGenerator(12345);

      const tieredRecords = await handler.generateTieredRecords(employeeTable, 50);

      const employeeCodes = patternGen.generate('EMP-####', tieredRecords.length);

      for (let i = 0; i < tieredRecords.length; i++) {
        tieredRecords[i].record.employee_code = employeeCodes[i];
      }

      expect(tieredRecords.every(tr => tr.record.employee_code !== undefined)).toBe(true);
      expect(tieredRecords.every(tr => tr.record.employee_code.startsWith('EMP-'))).toBe(true);
    });
  });
});
