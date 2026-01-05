import {
  TableSchema,
  GeneratedRecord,
  ValidationResult,
  ValidationError,
  SchemaDefinition,
  TableData
} from '../../types';
import { ConstraintExtractor } from '../analyzer/constraint-extractor';

export class ConstraintValidator {
  private constraintExtractor: ConstraintExtractor;

  constructor() {
    this.constraintExtractor = new ConstraintExtractor();
  }

  /**
   * Validate all generated data against schema
   */
  public validateAll(
    schema: SchemaDefinition,
    tableData: TableData[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const data of tableData) {
      const table = schema.tables.find(t => t.name === data.table);
      if (!table) {
        results.push({
          valid: false,
          table: data.table,
          errors: [{
            type: 'PRIMARY_KEY',
            message: `Table ${data.table} not found in schema`
          }]
        });
        continue;
      }

      const result = this.validate(table, data.records, tableData);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate records for a single table
   */
  public validate(
    table: TableSchema,
    records: GeneratedRecord[],
    allTableData?: TableData[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    errors.push(...this.validatePrimaryKeys(table, records));
    errors.push(...this.validateNotNull(table, records));
    errors.push(...this.validateUniqueConstraints(table, records));
    errors.push(...this.validateDataTypes(table, records));
    errors.push(...this.validateCheckConstraints(table, records));

    if (allTableData) {
      errors.push(...this.validateForeignKeys(table, records, allTableData));
    }

    return {
      valid: errors.length === 0,
      table: table.name,
      errors
    };
  }

  /**
   * Validate primary key constraints
   */
  private validatePrimaryKeys(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const pkColumns = this.constraintExtractor.getPrimaryKey(table);

    if (pkColumns.length === 0) {
      return errors;
    }

    const pkValues = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const pkParts: any[] = [];

      for (const col of pkColumns) {
        if (!(col in record)) {
          errors.push({
            type: 'PRIMARY_KEY',
            message: `Primary key column ${col} is missing`,
            rowIndex: i,
            columnName: col
          });
          continue;
        }

        const value = record[col];

        if (value === null || value === undefined) {
          errors.push({
            type: 'PRIMARY_KEY',
            message: `Primary key column ${col} cannot be NULL`,
            rowIndex: i,
            columnName: col
          });
        }

        pkParts.push(value);
      }

      if (pkParts.length === pkColumns.length) {
        const pkValue = JSON.stringify(pkParts);
        if (pkValues.has(pkValue)) {
          errors.push({
            type: 'PRIMARY_KEY',
            message: `Duplicate primary key value: ${pkValue}`,
            rowIndex: i
          });
        }
        pkValues.add(pkValue);
      }
    }

    return errors;
  }

  /**
   * Validate NOT NULL constraints
   */
  private validateNotNull(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const notNullColumns = this.constraintExtractor.getNotNullColumns(table);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      for (const col of notNullColumns) {
        if (!(col in record) || record[col] === null || record[col] === undefined) {
          errors.push({
            type: 'NOT_NULL',
            message: `Column ${col} cannot be NULL`,
            rowIndex: i,
            columnName: col
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate UNIQUE constraints
   */
  private validateUniqueConstraints(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const uniqueConstraints = this.constraintExtractor.getUniqueConstraints(table);

    for (const constraint of uniqueConstraints) {
      const values = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const valueParts: any[] = [];

        for (const col of constraint.columns) {
          if (col in record) {
            valueParts.push(record[col]);
          }
        }

        if (valueParts.length === constraint.columns.length) {
          const value = JSON.stringify(valueParts);
          if (values.has(value)) {
            errors.push({
              type: 'UNIQUE',
              message: `Duplicate unique value for columns (${constraint.columns.join(', ')}): ${value}`,
              rowIndex: i,
              constraint: constraint.name
            });
          }
          values.add(value);
        }
      }
    }

    return errors;
  }

  /**
   * Validate foreign key constraints
   */
  private validateForeignKeys(
    table: TableSchema,
    records: GeneratedRecord[],
    allTableData: TableData[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const foreignKeys = this.constraintExtractor.getForeignKeys(table);

    for (const fk of foreignKeys) {
      const referencedData = allTableData.find(td => td.table === fk.referencedTable);

      if (!referencedData) {
        errors.push({
          type: 'FOREIGN_KEY',
          message: `Referenced table ${fk.referencedTable} not found`,
          constraint: fk.name
        });
        continue;
      }

      const referencedValues = new Set<string>();
      for (const refRecord of referencedData.records) {
        const refParts: any[] = [];
        for (const refCol of fk.referencedColumns) {
          if (refCol in refRecord) {
            refParts.push(refRecord[refCol]);
          }
        }
        if (refParts.length === fk.referencedColumns.length) {
          referencedValues.add(JSON.stringify(refParts));
        }
      }

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const fkParts: any[] = [];
        let hasNull = false;

        for (const col of fk.columns) {
          const value = record[col];
          if (value === null || value === undefined) {
            hasNull = true;
            break;
          }
          fkParts.push(value);
        }

        if (hasNull) {
          continue;
        }

        if (fkParts.length === fk.columns.length) {
          const fkValue = JSON.stringify(fkParts);
          if (!referencedValues.has(fkValue)) {
            errors.push({
              type: 'FOREIGN_KEY',
              message: `Foreign key violation: value ${fkValue} not found in ${fk.referencedTable}(${fk.referencedColumns.join(', ')})`,
              rowIndex: i,
              constraint: fk.name
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate data types
   */
  private validateDataTypes(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      for (const column of table.columns) {
        if (!(column.name in record)) continue;

        const value = record[column.name];
        if (value === null || value === undefined) continue;

        const typeError = this.validateDataType(column.type, value, column);
        if (typeError) {
          errors.push({
            type: 'DATA_TYPE',
            message: `Invalid data type for column ${column.name}: ${typeError}`,
            rowIndex: i,
            columnName: column.name
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate specific data type
   */
  private validateDataType(type: string, value: any, column: any): string | null {
    switch (type) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT':
        if (!Number.isInteger(value)) {
          return `Expected integer, got ${typeof value}`;
        }
        break;

      case 'DECIMAL':
      case 'NUMERIC':
      case 'FLOAT':
      case 'DOUBLE':
      case 'REAL':
        if (typeof value !== 'number') {
          return `Expected number, got ${typeof value}`;
        }
        break;

      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
        if (typeof value !== 'string') {
          return `Expected string, got ${typeof value}`;
        }
        if (column.length && value.length > column.length) {
          return `String length ${value.length} exceeds maximum ${column.length}`;
        }
        break;

      case 'BOOLEAN':
      case 'BOOL':
        if (typeof value !== 'boolean') {
          return `Expected boolean, got ${typeof value}`;
        }
        break;

      case 'DATE':
      case 'DATETIME':
      case 'TIMESTAMP':
      case 'TIME':
        if (typeof value !== 'string') {
          return `Expected date string, got ${typeof value}`;
        }
        break;

      case 'JSON':
      case 'JSONB':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch (e) {
            return 'Invalid JSON string';
          }
        } else if (typeof value !== 'object') {
          return `Expected JSON string or object, got ${typeof value}`;
        }
        break;

      case 'UUID':
        if (typeof value !== 'string') {
          return `Expected UUID string, got ${typeof value}`;
        }
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(value)) {
          return 'Invalid UUID format';
        }
        break;
    }

    return null;
  }

  /**
   * Validate CHECK constraints (basic)
   */
  private validateCheckConstraints(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const checkConstraints = this.constraintExtractor.getCheckConstraints(table);

    for (const check of checkConstraints) {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        const valid = this.evaluateCheckConstraint(check.expression, record);
        if (!valid) {
          errors.push({
            type: 'CHECK',
            message: `CHECK constraint violated: ${check.expression}`,
            rowIndex: i,
            constraint: check.name
          });
        }
      }
    }

    return errors;
  }

  /**
   * Evaluate CHECK constraint expression (basic implementation)
   */
  private evaluateCheckConstraint(expression: string, record: GeneratedRecord): boolean {
    try {
      let evalExpr = expression;

      for (const [key, value] of Object.entries(record)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (typeof value === 'string') {
          evalExpr = evalExpr.replace(regex, `'${value}'`);
        } else if (value === null) {
          evalExpr = evalExpr.replace(regex, 'null');
        } else {
          evalExpr = evalExpr.replace(regex, String(value));
        }
      }

      return true;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get validation summary
   */
  public getValidationSummary(results: ValidationResult[]): any {
    const summary = {
      totalTables: results.length,
      validTables: 0,
      invalidTables: 0,
      totalErrors: 0,
      errorsByType: {} as Record<string, number>
    };

    for (const result of results) {
      if (result.valid) {
        summary.validTables++;
      } else {
        summary.invalidTables++;
      }

      summary.totalErrors += result.errors.length;

      for (const error of result.errors) {
        const type = error.type;
        summary.errorsByType[type] = (summary.errorsByType[type] || 0) + 1;
      }
    }

    return summary;
  }
}
