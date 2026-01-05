import {
  ValidationResult,
  ValidationError,
  GenerationReport,
  GenerationOptions,
  SchemaDefinition
} from '../../types';

export interface ValidationReportOptions {
  includeDetails: boolean;
  includeSuccesses: boolean;
  format: 'json' | 'text' | 'markdown';
}

export interface DetailedValidationReport {
  summary: {
    timestamp: string;
    totalTables: number;
    validTables: number;
    invalidTables: number;
    totalErrors: number;
    errorsByType: Record<string, number>;
    validationRate: number;
  };
  tables: {
    name: string;
    valid: boolean;
    recordCount: number;
    errorCount: number;
    errors: ValidationError[];
  }[];
  schema?: SchemaDefinition;
  options?: GenerationOptions;
}

export class ReportGenerator {
  /**
   * Generate a detailed validation report
   */
  public static generateValidationReport(
    validationResults: ValidationResult[],
    schema?: SchemaDefinition,
    options?: GenerationOptions,
    reportOptions?: Partial<ValidationReportOptions>
  ): DetailedValidationReport {
    const opts: ValidationReportOptions = {
      includeDetails: true,
      includeSuccesses: true,
      format: 'json',
      ...reportOptions
    };

    const errorsByType: Record<string, number> = {};
    const tables: DetailedValidationReport['tables'] = [];

    let totalErrors = 0;
    let validTables = 0;

    for (const result of validationResults) {
      if (result.valid) {
        validTables++;
      }

      if (!opts.includeSuccesses && result.valid) {
        continue;
      }

      const errorCount = result.errors.length;
      totalErrors += errorCount;

      for (const error of result.errors) {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      }

      tables.push({
        name: result.table,
        valid: result.valid,
        recordCount: 0,
        errorCount,
        errors: opts.includeDetails ? result.errors : []
      });
    }

    const summary = {
      timestamp: new Date().toISOString(),
      totalTables: validationResults.length,
      validTables,
      invalidTables: validationResults.length - validTables,
      totalErrors,
      errorsByType,
      validationRate: validationResults.length > 0
        ? (validTables / validationResults.length) * 100
        : 0
    };

    return {
      summary,
      tables,
      schema: opts.includeDetails ? schema : undefined,
      options: opts.includeDetails ? options : undefined
    };
  }

  /**
   * Generate a generation report
   */
  public static generateGenerationReport(
    validationResults: ValidationResult[],
    schema: SchemaDefinition,
    options: GenerationOptions,
    duration: number,
    recordsGenerated: number
  ): GenerationReport {
    return {
      timestamp: new Date().toISOString(),
      schema: schema.tables.map(t => t.name).join(', '),
      recordsGenerated,
      tablesGenerated: schema.tables.length,
      validationResults,
      duration,
      options
    };
  }

  /**
   * Format validation report as text
   */
  public static formatAsText(report: DetailedValidationReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('Summary:');
    lines.push(`  Timestamp: ${report.summary.timestamp}`);
    lines.push(`  Total Tables: ${report.summary.totalTables}`);
    lines.push(`  Valid Tables: ${report.summary.validTables}`);
    lines.push(`  Invalid Tables: ${report.summary.invalidTables}`);
    lines.push(`  Total Errors: ${report.summary.totalErrors}`);
    lines.push(`  Validation Rate: ${report.summary.validationRate.toFixed(2)}%`);
    lines.push('');

    if (Object.keys(report.summary.errorsByType).length > 0) {
      lines.push('Errors by Type:');
      for (const [type, count] of Object.entries(report.summary.errorsByType)) {
        lines.push(`  ${type}: ${count}`);
      }
      lines.push('');
    }

    if (report.tables.length > 0) {
      lines.push('Tables:');
      lines.push('-'.repeat(80));

      for (const table of report.tables) {
        lines.push('');
        lines.push(`Table: ${table.name}`);
        lines.push(`  Status: ${table.valid ? 'VALID' : 'INVALID'}`);
        lines.push(`  Errors: ${table.errorCount}`);

        if (table.errors.length > 0) {
          lines.push('  Details:');
          for (const error of table.errors) {
            const location = error.rowIndex !== undefined
              ? ` [Row ${error.rowIndex}${error.columnName ? `, Column ${error.columnName}` : ''}]`
              : '';
            lines.push(`    - [${error.type}]${location} ${error.message}`);
          }
        }
      }
    }

    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Format validation report as markdown
   */
  public static formatAsMarkdown(report: DetailedValidationReport): string {
    const lines: string[] = [];

    lines.push('# Validation Report');
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Timestamp**: ${report.summary.timestamp}`);
    lines.push(`- **Total Tables**: ${report.summary.totalTables}`);
    lines.push(`- **Valid Tables**: ${report.summary.validTables}`);
    lines.push(`- **Invalid Tables**: ${report.summary.invalidTables}`);
    lines.push(`- **Total Errors**: ${report.summary.totalErrors}`);
    lines.push(`- **Validation Rate**: ${report.summary.validationRate.toFixed(2)}%`);
    lines.push('');

    if (Object.keys(report.summary.errorsByType).length > 0) {
      lines.push('### Errors by Type');
      lines.push('');
      lines.push('| Error Type | Count |');
      lines.push('|------------|-------|');
      for (const [type, count] of Object.entries(report.summary.errorsByType)) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push('');
    }

    if (report.tables.length > 0) {
      lines.push('## Tables');
      lines.push('');

      for (const table of report.tables) {
        const status = table.valid ? '✅ VALID' : '❌ INVALID';
        lines.push(`### ${table.name} ${status}`);
        lines.push('');
        lines.push(`- **Error Count**: ${table.errorCount}`);

        if (table.errors.length > 0) {
          lines.push('');
          lines.push('#### Errors');
          lines.push('');

          for (const error of table.errors) {
            const location = error.rowIndex !== undefined
              ? ` (Row ${error.rowIndex}${error.columnName ? `, Column ${error.columnName}` : ''})`
              : '';
            lines.push(`- **[${error.type}]**${location}: ${error.message}`);
          }
        }

        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format validation report as JSON
   */
  public static formatAsJSON(report: DetailedValidationReport, pretty: boolean = true): string {
    return JSON.stringify(report, null, pretty ? 2 : 0);
  }

  /**
   * Format validation report based on format option
   */
  public static format(report: DetailedValidationReport, format: 'json' | 'text' | 'markdown'): string {
    switch (format) {
      case 'text':
        return this.formatAsText(report);
      case 'markdown':
        return this.formatAsMarkdown(report);
      case 'json':
      default:
        return this.formatAsJSON(report);
    }
  }

  /**
   * Generate summary statistics
   */
  public static generateStatistics(validationResults: ValidationResult[]): {
    totalTables: number;
    validTables: number;
    invalidTables: number;
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByTable: Record<string, number>;
    validationRate: number;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsByTable: Record<string, number> = {};
    let totalErrors = 0;
    let validTables = 0;

    for (const result of validationResults) {
      if (result.valid) {
        validTables++;
      }

      const errorCount = result.errors.length;
      totalErrors += errorCount;
      errorsByTable[result.table] = errorCount;

      for (const error of result.errors) {
        errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      }
    }

    return {
      totalTables: validationResults.length,
      validTables,
      invalidTables: validationResults.length - validTables,
      totalErrors,
      errorsByType,
      errorsByTable,
      validationRate: validationResults.length > 0
        ? (validTables / validationResults.length) * 100
        : 0
    };
  }

  /**
   * Generate a compact summary string
   */
  public static generateCompactSummary(validationResults: ValidationResult[]): string {
    const stats = this.generateStatistics(validationResults);

    if (stats.totalErrors === 0) {
      return `✓ All ${stats.totalTables} tables validated successfully (100%)`;
    }

    return `✗ ${stats.invalidTables} of ${stats.totalTables} tables have errors (${stats.validationRate.toFixed(1)}% valid, ${stats.totalErrors} total errors)`;
  }

  /**
   * Save report to file (returns formatted content)
   */
  public static prepareForFile(
    validationResults: ValidationResult[],
    schema: SchemaDefinition,
    options: GenerationOptions,
    format: 'json' | 'text' | 'markdown' = 'json'
  ): string {
    const report = this.generateValidationReport(
      validationResults,
      schema,
      options,
      { includeDetails: true, includeSuccesses: true, format }
    );

    return this.format(report, format);
  }
}
