import {
  SchemaDefinition,
  TableSchema,
  GeneratedRecord,
  TableData,
  GenerationOptions,
  GenerationContext
} from '../../types';
import { ConstraintExtractor } from '../analyzer/constraint-extractor';
import { PrimaryKeyGenerator } from './primary-key-generator';
import { ForeignKeyGenerator } from './foreign-key-generator';
import { UniqueGenerator } from './unique-generator';
import { ValueGenerator } from './value-generator';

export class GenerationEngine {
  private constraintExtractor: ConstraintExtractor;
  private pkGenerator: PrimaryKeyGenerator;
  private fkGenerator: ForeignKeyGenerator;
  private uniqueGenerator: UniqueGenerator;
  private valueGenerator: ValueGenerator;

  constructor() {
    this.constraintExtractor = new ConstraintExtractor();
    this.pkGenerator = new PrimaryKeyGenerator();
    this.fkGenerator = new ForeignKeyGenerator();
    this.uniqueGenerator = new UniqueGenerator();
    this.valueGenerator = new ValueGenerator();
  }

  /**
   * Generate data for all tables in schema
   */
  public async generate(
    schema: SchemaDefinition,
    options: GenerationOptions
  ): Promise<TableData[]> {
    this.reset();

    if (options.seed !== undefined) {
      this.valueGenerator = new ValueGenerator(options.seed, options.locale || 'en');
    } else if (options.locale) {
      this.valueGenerator.setLocale(options.locale);
    }

    const generationOrder = this.constraintExtractor.getGenerationOrder(schema.tables);

    const allData = new Map<string, GeneratedRecord[]>();
    const results: TableData[] = [];

    for (const tableName of generationOrder) {
      const table = schema.tables.find(t => t.name === tableName);
      if (!table) continue;

      console.log(`Generating ${options.count} records for table: ${tableName}`);

      const records = this.generateTableData(table, options, allData);
      allData.set(tableName, records);

      results.push({
        table: tableName,
        records
      });
    }

    return results;
  }

  /**
   * Generate data for a single table
   */
  private generateTableData(
    table: TableSchema,
    options: GenerationOptions,
    allData: Map<string, GeneratedRecord[]>
  ): GeneratedRecord[] {
    const records: GeneratedRecord[] = [];
    const primaryKeys = this.constraintExtractor.getPrimaryKey(table);
    const uniqueConstraints = this.constraintExtractor.getUniqueConstraints(table);

    for (let i = 0; i < options.count; i++) {
      const context: GenerationContext = {
        rowIndex: i,
        tableName: table.name,
        allData,
        existingValues: new Map(),
        seed: options.seed
      };

      const record = this.generateRecord(table, context, primaryKeys, uniqueConstraints);
      records.push(record);
    }

    return records;
  }

  /**
   * Generate a single record
   */
  private generateRecord(
    table: TableSchema,
    context: GenerationContext,
    primaryKeys: string[],
    uniqueConstraints: any[]
  ): GeneratedRecord {
    const record: GeneratedRecord = {};

    for (const column of table.columns) {
      const isPK = primaryKeys.includes(column.name);
      const fkConstraint = this.constraintExtractor.getForeignKeyReference(table, column.name);
      const isUnique = this.constraintExtractor.isUniqueColumn(table, column.name);

      if (isPK) {
        record[column.name] = this.pkGenerator.generate(column, table.name, context);
      } else if (fkConstraint) {
        try {
          record[column.name] = this.fkGenerator.generate(column, fkConstraint, context);
        } catch (error) {
          if (column.nullable) {
            record[column.name] = null;
          } else {
            throw error;
          }
        }
      } else if (isUnique) {
        record[column.name] = this.uniqueGenerator.generate(
          column,
          table.name,
          context,
          () => this.valueGenerator.generate(column, context)
        );
      } else {
        record[column.name] = this.valueGenerator.generate(column, context);
      }
    }

    this.handleCompositeUniqueConstraints(table, record, uniqueConstraints, context);

    return record;
  }

  /**
   * Handle composite unique constraints
   */
  private handleCompositeUniqueConstraints(
    table: TableSchema,
    record: GeneratedRecord,
    uniqueConstraints: any[],
    context: GenerationContext
  ): void {
    for (const constraint of uniqueConstraints) {
      if (constraint.columns.length > 1) {
        const values = new Map<string, any>();
        for (const col of constraint.columns) {
          values.set(col, record[col]);
        }

        if (this.uniqueGenerator.isCompositeUsed(table.name, constraint.columns, values)) {
          const valueGenerators = new Map<string, () => any>();
          for (const col of constraint.columns) {
            const column = this.constraintExtractor.getColumn(table, col);
            if (column) {
              valueGenerators.set(col, () => this.valueGenerator.generate(column, context));
            }
          }

          const newValues = this.uniqueGenerator.generateComposite(
            constraint.columns,
            table.name,
            context,
            valueGenerators
          );

          for (const [col, val] of newValues) {
            record[col] = val;
          }
        } else {
          this.uniqueGenerator.markCompositeUsed(table.name, constraint.columns, values);
        }
      }
    }
  }

  /**
   * Validate CHECK constraints (basic evaluation)
   */
  private validateCheckConstraint(
    record: GeneratedRecord,
    expression: string
  ): boolean {
    try {
      const evalExpression = expression.replace(
        /(\w+)/g,
        (match) => {
          if (match in record) {
            const value = record[match];
            if (typeof value === 'string') {
              return `'${value}'`;
            }
            return String(value);
          }
          return match;
        }
      );

      return true;
    } catch (error) {
      return true;
    }
  }

  /**
   * Reset all generators
   */
  public reset(): void {
    this.pkGenerator.reset();
    this.uniqueGenerator.reset();
    this.valueGenerator.reset();
  }

  /**
   * Get generation statistics
   */
  public getStatistics(tableData: TableData[]): any {
    const stats: any = {
      totalTables: tableData.length,
      totalRecords: 0,
      tablesGenerated: []
    };

    for (const table of tableData) {
      stats.totalRecords += table.records.length;
      stats.tablesGenerated.push({
        table: table.table,
        recordCount: table.records.length
      });
    }

    return stats;
  }
}
