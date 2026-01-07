import { ReportGenerator } from '../../src/core/validator/report-generator';
import { ValidationResult, SchemaDefinition, GenerationOptions } from '../../src/types';

describe('ReportGenerator', () => {
  const mockSchema: SchemaDefinition = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'email', type: 'VARCHAR', nullable: false }
        ],
        constraints: [
          { type: 'PRIMARY_KEY', columns: ['id'] },
          { type: 'UNIQUE', columns: ['email'] }
        ]
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'INT', nullable: false },
          { name: 'user_id', type: 'INT', nullable: false },
          { name: 'title', type: 'VARCHAR', nullable: false }
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

  const mockOptions: GenerationOptions = {
    count: 10,
    seed: 12345,
    locale: 'en_US',
    format: 'sql'
  };

  describe('generateValidationReport', () => {
    it('should generate report for all valid results', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: true,
          errors: []
        },
        {
          table: 'posts',
          valid: true,
          errors: []
        }
      ];

      const report = ReportGenerator.generateValidationReport(
        validationResults,
        mockSchema,
        mockOptions
      );

      expect(report.summary.totalTables).toBe(2);
      expect(report.summary.validTables).toBe(2);
      expect(report.summary.invalidTables).toBe(0);
      expect(report.summary.totalErrors).toBe(0);
      expect(report.summary.validationRate).toBe(100);
      expect(report.tables).toHaveLength(2);
    });

    it('should generate report with validation errors', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: false,
          errors: [
            {
              type: 'UNIQUE_VIOLATION',
              message: 'Duplicate email found',
              columnName: 'email',
              rowIndex: 5
            },
            {
              type: 'UNIQUE_VIOLATION',
              message: 'Duplicate email found',
              columnName: 'email',
              rowIndex: 8
            }
          ]
        },
        {
          table: 'posts',
          valid: true,
          errors: []
        }
      ];

      const report = ReportGenerator.generateValidationReport(
        validationResults,
        mockSchema,
        mockOptions
      );

      expect(report.summary.totalTables).toBe(2);
      expect(report.summary.validTables).toBe(1);
      expect(report.summary.invalidTables).toBe(1);
      expect(report.summary.totalErrors).toBe(2);
      expect(report.summary.errorsByType['UNIQUE_VIOLATION']).toBe(2);
      expect(report.summary.validationRate).toBe(50);
    });

    it('should include schema and options when requested', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(
        validationResults,
        mockSchema,
        mockOptions,
        { includeDetails: true, includeSuccesses: true, format: 'json' }
      );

      expect(report.schema).toBeDefined();
      expect(report.options).toBeDefined();
    });

    it('should exclude successful tables when includeSuccesses is false', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        {
          table: 'posts',
          valid: false,
          errors: [{ type: 'FK_VIOLATION', message: 'Invalid foreign key' }]
        }
      ];

      const report = ReportGenerator.generateValidationReport(
        validationResults,
        mockSchema,
        mockOptions,
        { includeSuccesses: false, includeDetails: true, format: 'json' }
      );

      expect(report.tables).toHaveLength(1);
      expect(report.tables[0].name).toBe('posts');
    });

    it('should calculate error statistics correctly', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: false,
          errors: [
            { type: 'PRIMARY_KEY_VIOLATION', message: 'Duplicate PK' },
            { type: 'UNIQUE_VIOLATION', message: 'Duplicate email' }
          ]
        },
        {
          table: 'posts',
          valid: false,
          errors: [
            { type: 'FK_VIOLATION', message: 'Invalid FK' },
            { type: 'FK_VIOLATION', message: 'Invalid FK' },
            { type: 'PRIMARY_KEY_VIOLATION', message: 'Duplicate PK' }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);

      expect(report.summary.errorsByType['PRIMARY_KEY_VIOLATION']).toBe(2);
      expect(report.summary.errorsByType['UNIQUE_VIOLATION']).toBe(1);
      expect(report.summary.errorsByType['FK_VIOLATION']).toBe(2);
    });
  });

  describe('generateGenerationReport', () => {
    it('should generate generation report with correct data', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        { table: 'posts', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateGenerationReport(
        validationResults,
        mockSchema,
        mockOptions,
        1234,
        20
      );

      expect(report.timestamp).toBeDefined();
      expect(report.schema).toBe('users, posts');
      expect(report.recordsGenerated).toBe(20);
      expect(report.tablesGenerated).toBe(2);
      expect(report.duration).toBe(1234);
      expect(report.validationResults).toEqual(validationResults);
      expect(report.options).toEqual(mockOptions);
    });
  });

  describe('formatAsText', () => {
    it('should format report as text', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: false,
          errors: [
            {
              type: 'UNIQUE_VIOLATION',
              message: 'Duplicate value found',
              columnName: 'email',
              rowIndex: 3
            }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const text = ReportGenerator.formatAsText(report);

      expect(text).toContain('VALIDATION REPORT');
      expect(text).toContain('Summary:');
      expect(text).toContain('Total Tables: 1');
      expect(text).toContain('Valid Tables: 0');
      expect(text).toContain('Invalid Tables: 1');
      expect(text).toContain('Total Errors: 1');
      expect(text).toContain('users');
      expect(text).toContain('INVALID');
      expect(text).toContain('UNIQUE_VIOLATION');
      expect(text).toContain('Duplicate value found');
    });

    it('should include error details in text format', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'posts',
          valid: false,
          errors: [
            {
              type: 'FK_VIOLATION',
              message: 'Foreign key violation',
              columnName: 'user_id',
              rowIndex: 5
            }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const text = ReportGenerator.formatAsText(report);

      expect(text).toContain('Row 5');
      expect(text).toContain('Column user_id');
      expect(text).toContain('FK_VIOLATION');
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format report as markdown', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        {
          table: 'posts',
          valid: false,
          errors: [
            { type: 'PRIMARY_KEY_VIOLATION', message: 'Duplicate primary key' }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const markdown = ReportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('# Validation Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Tables');
      expect(markdown).toContain('### users');
      expect(markdown).toContain('### posts');
      expect(markdown).toContain('✅ VALID');
      expect(markdown).toContain('❌ INVALID');
      expect(markdown).toContain('**Error Count**');
    });

    it('should include error type table in markdown', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: false,
          errors: [
            { type: 'UNIQUE_VIOLATION', message: 'Error 1' },
            { type: 'PRIMARY_KEY_VIOLATION', message: 'Error 2' }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const markdown = ReportGenerator.formatAsMarkdown(report);

      expect(markdown).toContain('### Errors by Type');
      expect(markdown).toContain('| Error Type | Count |');
      expect(markdown).toContain('UNIQUE_VIOLATION');
      expect(markdown).toContain('PRIMARY_KEY_VIOLATION');
    });
  });

  describe('formatAsJSON', () => {
    it('should format report as JSON', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const json = ReportGenerator.formatAsJSON(report);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.summary).toBeDefined();
      expect(parsed.tables).toBeDefined();
    });

    it('should format as compact JSON when pretty is false', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const compactJson = ReportGenerator.formatAsJSON(report, false);
      const prettyJson = ReportGenerator.formatAsJSON(report, true);

      expect(compactJson.length).toBeLessThan(prettyJson.length);
      expect(compactJson).not.toContain('\n');
      expect(prettyJson).toContain('\n');
    });
  });

  describe('format', () => {
    it('should format as text when format is text', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const output = ReportGenerator.format(report, 'text');

      expect(output).toContain('VALIDATION REPORT');
      expect(output).toContain('='.repeat(80));
    });

    it('should format as markdown when format is markdown', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const output = ReportGenerator.format(report, 'markdown');

      expect(output).toContain('# Validation Report');
      expect(output).toContain('## Summary');
    });

    it('should format as JSON when format is json', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const output = ReportGenerator.format(report, 'json');

      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('generateStatistics', () => {
    it('should calculate statistics correctly', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        {
          table: 'posts',
          valid: false,
          errors: [
            { type: 'PRIMARY_KEY_VIOLATION', message: 'Error 1' },
            { type: 'UNIQUE_VIOLATION', message: 'Error 2' }
          ]
        },
        {
          table: 'comments',
          valid: false,
          errors: [
            { type: 'FK_VIOLATION', message: 'Error 3' }
          ]
        }
      ];

      const stats = ReportGenerator.generateStatistics(validationResults);

      expect(stats.totalTables).toBe(3);
      expect(stats.validTables).toBe(1);
      expect(stats.invalidTables).toBe(2);
      expect(stats.totalErrors).toBe(3);
      expect(stats.validationRate).toBeCloseTo(33.33, 1);
      expect(stats.errorsByType['PRIMARY_KEY_VIOLATION']).toBe(1);
      expect(stats.errorsByType['UNIQUE_VIOLATION']).toBe(1);
      expect(stats.errorsByType['FK_VIOLATION']).toBe(1);
      expect(stats.errorsByTable['users']).toBe(0);
      expect(stats.errorsByTable['posts']).toBe(2);
      expect(stats.errorsByTable['comments']).toBe(1);
    });

    it('should handle zero errors correctly', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        { table: 'posts', valid: true, errors: [] }
      ];

      const stats = ReportGenerator.generateStatistics(validationResults);

      expect(stats.totalErrors).toBe(0);
      expect(stats.validationRate).toBe(100);
      expect(Object.keys(stats.errorsByType)).toHaveLength(0);
    });
  });

  describe('generateCompactSummary', () => {
    it('should generate success summary for all valid tables', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        { table: 'posts', valid: true, errors: [] }
      ];

      const summary = ReportGenerator.generateCompactSummary(validationResults);

      expect(summary).toContain('✓');
      expect(summary).toContain('2 tables');
      expect(summary).toContain('100%');
    });

    it('should generate error summary for invalid tables', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] },
        {
          table: 'posts',
          valid: false,
          errors: [
            { type: 'ERROR', message: 'Error 1' },
            { type: 'ERROR', message: 'Error 2' }
          ]
        }
      ];

      const summary = ReportGenerator.generateCompactSummary(validationResults);

      expect(summary).toContain('✗');
      expect(summary).toContain('1 of 2 tables');
      expect(summary).toContain('50.0% valid');
      expect(summary).toContain('2 total errors');
    });
  });

  describe('prepareForFile', () => {
    it('should prepare JSON report for file', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const content = ReportGenerator.prepareForFile(
        validationResults,
        mockSchema,
        mockOptions,
        'json'
      );

      expect(() => JSON.parse(content)).not.toThrow();
      const parsed = JSON.parse(content);
      expect(parsed.summary).toBeDefined();
      expect(parsed.tables).toBeDefined();
    });

    it('should prepare text report for file', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const content = ReportGenerator.prepareForFile(
        validationResults,
        mockSchema,
        mockOptions,
        'text'
      );

      expect(content).toContain('VALIDATION REPORT');
      expect(content).toContain('Summary:');
    });

    it('should prepare markdown report for file', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: true, errors: [] }
      ];

      const content = ReportGenerator.prepareForFile(
        validationResults,
        mockSchema,
        mockOptions,
        'markdown'
      );

      expect(content).toContain('# Validation Report');
      expect(content).toContain('## Summary');
    });
  });

  describe('edge cases', () => {
    it('should handle empty validation results', () => {
      const validationResults: ValidationResult[] = [];

      const report = ReportGenerator.generateValidationReport(validationResults);

      expect(report.summary.totalTables).toBe(0);
      expect(report.summary.validTables).toBe(0);
      expect(report.summary.invalidTables).toBe(0);
      expect(report.summary.validationRate).toBe(0);
      expect(report.tables).toHaveLength(0);
    });

    it('should handle validation results with no errors but invalid flag', () => {
      const validationResults: ValidationResult[] = [
        { table: 'users', valid: false, errors: [] }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);

      expect(report.summary.validTables).toBe(0);
      expect(report.summary.invalidTables).toBe(1);
      expect(report.summary.totalErrors).toBe(0);
    });

    it('should handle errors without row or column information', () => {
      const validationResults: ValidationResult[] = [
        {
          table: 'users',
          valid: false,
          errors: [
            { type: 'SCHEMA_ERROR', message: 'Invalid schema' }
          ]
        }
      ];

      const report = ReportGenerator.generateValidationReport(validationResults);
      const text = ReportGenerator.formatAsText(report);
      const markdown = ReportGenerator.formatAsMarkdown(report);

      expect(text).toContain('SCHEMA_ERROR');
      expect(text).toContain('Invalid schema');
      expect(markdown).toContain('SCHEMA_ERROR');
      expect(markdown).toContain('Invalid schema');
    });

    it('should handle very large error counts', () => {
      const errors = Array.from({ length: 1000 }, (_, i) => ({
        type: 'VALIDATION_ERROR',
        message: `Error ${i}`
      }));

      const validationResults: ValidationResult[] = [
        { table: 'users', valid: false, errors }
      ];

      const stats = ReportGenerator.generateStatistics(validationResults);

      expect(stats.totalErrors).toBe(1000);
      expect(stats.errorsByType['VALIDATION_ERROR']).toBe(1000);
      expect(stats.errorsByTable['users']).toBe(1000);
    });
  });
});
