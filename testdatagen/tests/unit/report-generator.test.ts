import { ReportGenerator } from '../../src/core/validator/report-generator';
import { TableSchema } from '../../src/types';

describe('ReportGenerator', () => {
  let reportGen: ReportGenerator;

  beforeEach(() => {
    reportGen = new ReportGenerator();
  });

  describe('constraint validation report', () => {
    it('generates report for successful validation', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'email', type: 'VARCHAR(255)', constraints: { unique: true, notNull: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        users: [
          { id: 1, email: 'user1@example.com' },
          { id: 2, email: 'user2@example.com' }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(true);
      expect(report.totalConstraints).toBeGreaterThan(0);
      expect(report.violatedConstraints).toBe(0);
      expect(report.violations).toHaveLength(0);
    });

    it('reports primary key violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        products: [
          { id: 1 },
          { id: 1 }, // Duplicate PK
          { id: 2 }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(false);
      expect(report.violatedConstraints).toBeGreaterThan(0);

      const pkViolations = report.violations.filter(v => v.type === 'PRIMARY_KEY');
      expect(pkViolations.length).toBeGreaterThan(0);
    });

    it('reports unique constraint violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'email', type: 'VARCHAR(255)', constraints: { unique: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        users: [
          { id: 1, email: 'test@example.com' },
          { id: 2, email: 'test@example.com' }, // Duplicate email
          { id: 3, email: 'unique@example.com' }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(false);

      const uniqueViolations = report.violations.filter(v => v.type === 'UNIQUE');
      expect(uniqueViolations.length).toBeGreaterThan(0);
      expect(uniqueViolations[0].column).toBe('email');
    });

    it('reports NOT NULL violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'customer_id', type: 'INTEGER', constraints: { notNull: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        orders: [
          { id: 1, customer_id: 100 },
          { id: 2, customer_id: null }, // NULL violation
          { id: 3, customer_id: 200 }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(false);

      const notNullViolations = report.violations.filter(v => v.type === 'NOT_NULL');
      expect(notNullViolations.length).toBeGreaterThan(0);
      expect(notNullViolations[0].column).toBe('customer_id');
    });

    it('reports foreign key violations', () => {
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

      const data = {
        users: [
          { id: 1 },
          { id: 2 }
        ],
        orders: [
          { id: 1, user_id: 1 },
          { id: 2, user_id: 999 }, // Orphan FK
          { id: 3, user_id: 2 }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(false);

      const fkViolations = report.violations.filter(v => v.type === 'FOREIGN_KEY');
      expect(fkViolations.length).toBeGreaterThan(0);
      expect(fkViolations[0].column).toBe('user_id');
    });

    it('reports CHECK constraint violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'price', type: 'DECIMAL', constraints: { check: 'price > 0' } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        products: [
          { id: 1, price: 10.99 },
          { id: 2, price: -5.00 }, // Negative price
          { id: 3, price: 0 }       // Zero price
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      expect(report.success).toBe(false);

      const checkViolations = report.violations.filter(v => v.type === 'CHECK');
      expect(checkViolations.length).toBeGreaterThan(0);
    });
  });

  describe('statistical report', () => {
    it('generates distribution statistics', () => {
      const data = {
        users: [
          { id: 1, age: 25 },
          { id: 2, age: 30 },
          { id: 3, age: 35 },
          { id: 4, age: 40 },
          { id: 5, age: 45 }
        ]
      };

      const report = reportGen.generateStatisticalReport('users', 'age', data.users.map(u => u.age));

      expect(report.mean).toBeDefined();
      expect(report.median).toBe(35);
      expect(report.stdDev).toBeGreaterThan(0);
      expect(report.min).toBe(25);
      expect(report.max).toBe(45);
    });

    it('calculates percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const report = reportGen.generateStatisticalReport('test', 'value', values);

      expect(report.percentile25).toBeDefined();
      expect(report.percentile50).toBe(5.5); // Median
      expect(report.percentile75).toBeDefined();
      expect(report.percentile95).toBeDefined();
    });

    it('detects uniform distribution', () => {
      const values = Array.from({ length: 100 }, (_, i) => i % 10); // Uniform 0-9
      const report = reportGen.generateStatisticalReport('test', 'category', values);

      expect(report.distribution).toBe('UNIFORM');
    });

    it('detects normal distribution', () => {
      // Generate approximately normal distribution
      const values = Array.from({ length: 1000 }, () => {
        const u1 = Math.random();
        const u2 = Math.random();
        // Box-Muller transform
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 10 + 50;
      });

      const report = reportGen.generateStatisticalReport('test', 'score', values);

      expect(report.distribution).toBe('NORMAL');
    });

    it('detects skewed distribution', () => {
      // Generate skewed distribution (exponential-like)
      const values = Array.from({ length: 1000 }, () => Math.pow(Math.random(), 3) * 100);
      const report = reportGen.generateStatisticalReport('test', 'value', values);

      expect(report.skewness).toBeDefined();
      expect(Math.abs(report.skewness)).toBeGreaterThan(0.5);
    });
  });

  describe('data quality metrics', () => {
    it('calculates completeness ratio', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: null },
          { id: 3, name: null, email: 'charlie@example.com' }
        ]
      };

      const report = reportGen.generateDataQualityReport(data);

      expect(report.completeness).toBeDefined();
      expect(report.completeness.email).toBeCloseTo(0.667, 2);
      expect(report.completeness.name).toBeCloseTo(0.667, 2);
    });

    it('calculates uniqueness ratio', () => {
      const data = {
        products: [
          { id: 1, sku: 'ABC-123' },
          { id: 2, sku: 'DEF-456' },
          { id: 3, sku: 'ABC-123' }, // Duplicate
          { id: 4, sku: 'GHI-789' }
        ]
      };

      const report = reportGen.generateDataQualityReport(data);

      expect(report.uniqueness).toBeDefined();
      expect(report.uniqueness.sku).toBeCloseTo(0.75, 2); // 3 unique / 4 total
    });

    it('identifies data type consistency', () => {
      const data = {
        items: [
          { id: 1, quantity: 10 },
          { id: 2, quantity: 20 },
          { id: 3, quantity: 30 }
        ]
      };

      const report = reportGen.generateDataQualityReport(data);

      expect(report.typeConsistency).toBeDefined();
      expect(report.typeConsistency.quantity).toBe('number');
    });
  });

  describe('summary report', () => {
    it('generates comprehensive summary', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'email', type: 'VARCHAR(255)', constraints: { unique: true } }
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

      const data = {
        users: [
          { id: 1, email: 'user1@example.com' },
          { id: 2, email: 'user2@example.com' }
        ],
        orders: [
          { id: 1, user_id: 1 },
          { id: 2, user_id: 1 },
          { id: 3, user_id: 2 }
        ]
      };

      const summary = reportGen.generateSummaryReport(tables, data);

      expect(summary.totalTables).toBe(2);
      expect(summary.totalRecords).toBe(5);
      expect(summary.recordsByTable.users).toBe(2);
      expect(summary.recordsByTable.orders).toBe(3);
      expect(summary.constraintsSatisfied).toBe(true);
    });

    it('includes generation metadata', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [{ name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }],
          foreignKeys: []
        }
      ];

      const data = { test: [{ id: 1 }] };
      const options = {
        seed: 42,
        locale: 'en_US',
        edgeCasePercentage: 5
      };

      const summary = reportGen.generateSummaryReport(tables, data, options);

      expect(summary.metadata).toBeDefined();
      expect(summary.metadata.seed).toBe(42);
      expect(summary.metadata.locale).toBe('en_US');
      expect(summary.metadata.edgeCasePercentage).toBe(5);
    });

    it('includes timestamp in report', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [{ name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }],
          foreignKeys: []
        }
      ];

      const data = { test: [{ id: 1 }] };
      const summary = reportGen.generateSummaryReport(tables, data);

      expect(summary.generatedAt).toBeDefined();
      expect(new Date(summary.generatedAt).toString()).not.toBe('Invalid Date');
    });
  });

  describe('export formats', () => {
    it('exports report as JSON', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [{ name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }],
          foreignKeys: []
        }
      ];

      const data = { test: [{ id: 1 }] };
      const report = reportGen.generateSummaryReport(tables, data);
      const json = reportGen.exportAsJSON(report);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.totalTables).toBe(1);
    });

    it('exports report as Markdown', () => {
      const tables: TableSchema[] = [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'email', type: 'VARCHAR(255)', constraints: { unique: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = { users: [{ id: 1, email: 'test@example.com' }] };
      const report = reportGen.generateSummaryReport(tables, data);
      const markdown = reportGen.exportAsMarkdown(report);

      expect(markdown).toContain('# Test Data Generation Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('users');
    });

    it('exports report as HTML', () => {
      const tables: TableSchema[] = [
        {
          name: 'test',
          columns: [{ name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }],
          foreignKeys: []
        }
      ];

      const data = { test: [{ id: 1 }] };
      const report = reportGen.generateSummaryReport(tables, data);
      const html = reportGen.exportAsHTML(report);

      expect(html).toContain('<html');
      expect(html).toContain('<table');
      expect(html).toContain('Test Data Generation Report');
    });
  });

  describe('violation details', () => {
    it('includes row numbers in violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'items',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        items: [
          { id: 1 },
          { id: 2 },
          { id: 2 }, // Duplicate at row 3
          { id: 3 }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      const violation = report.violations[0];
      expect(violation.rowNumber).toBe(3);
    });

    it('includes actual and expected values in violations', () => {
      const tables: TableSchema[] = [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', constraints: { primaryKey: true } },
            { name: 'price', type: 'DECIMAL', constraints: { check: 'price > 0' } }
          ],
          foreignKeys: []
        }
      ];

      const data = {
        products: [
          { id: 1, price: 10 },
          { id: 2, price: -5 }
        ]
      };

      const report = reportGen.generateConstraintReport(tables, data);

      const violation = report.violations.find(v => v.type === 'CHECK');
      expect(violation).toBeDefined();
      expect(violation!.actualValue).toBe(-5);
      expect(violation!.expectedCondition).toContain('> 0');
    });
  });
});
