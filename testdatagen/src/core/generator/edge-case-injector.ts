import { ColumnDefinition, GeneratedRecord } from '../../types';

export interface EdgeCase {
  type: 'null' | 'empty' | 'boundary' | 'special';
  value: any;
  applicableTypes: string[];
}

export class EdgeCaseInjector {
  private percentage: number;
  private seed?: number;
  private random: () => number;
  private callCount: number = 0;

  constructor(percentage: number = 5, seed?: number) {
    this.percentage = Math.max(0, Math.min(100, percentage));
    this.seed = seed;

    if (seed !== undefined) {
      this.random = this.seededRandom(seed);
    } else {
      this.random = Math.random;
    }
  }

  /**
   * Seeded random number generator (LCG algorithm)
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Determine if this row should have edge cases injected
   */
  public shouldInject(): boolean {
    return this.random() * 100 < this.percentage;
  }

  /**
   * Inject edge cases into a record
   */
  public inject(
    record: GeneratedRecord,
    columns: ColumnDefinition[],
    excludeColumns: string[] = []
  ): GeneratedRecord {
    const result = { ...record };

    if (!this.shouldInject()) {
      return result;
    }

    const eligibleColumns = columns.filter(col =>
      !excludeColumns.includes(col.name) &&
      col.nullable !== false
    );

    if (eligibleColumns.length === 0) {
      return result;
    }

    const columnToModify = eligibleColumns[Math.floor(this.random() * eligibleColumns.length)];
    const edgeCase = this.getEdgeCaseForColumn(columnToModify);

    if (edgeCase) {
      result[columnToModify.name] = edgeCase.value;
    }

    return result;
  }

  /**
   * Inject edge cases into multiple records
   */
  public injectBatch(
    records: GeneratedRecord[],
    columns: ColumnDefinition[],
    excludeColumns: string[] = []
  ): GeneratedRecord[] {
    return records.map(record => this.inject(record, columns, excludeColumns));
  }

  /**
   * Get appropriate edge case for a column
   */
  private getEdgeCaseForColumn(column: ColumnDefinition): EdgeCase | null {
    const edgeCases = this.getEdgeCasesForType(column.type);

    if (edgeCases.length === 0) {
      return null;
    }

    const idx = Math.floor(this.random() * edgeCases.length);
    return edgeCases[idx];
  }

  /**
   * Get all edge cases for a specific data type
   */
  private getEdgeCasesForType(type: string): EdgeCase[] {
    const cases: EdgeCase[] = [];

    switch (type.toUpperCase()) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
        cases.push(
          { type: 'boundary', value: 0, applicableTypes: ['INT', 'INTEGER', 'BIGINT'] },
          { type: 'boundary', value: -1, applicableTypes: ['INT', 'INTEGER', 'BIGINT'] },
          { type: 'boundary', value: 1, applicableTypes: ['INT', 'INTEGER', 'BIGINT'] },
          { type: 'boundary', value: 2147483647, applicableTypes: ['INT', 'INTEGER'] },
          { type: 'boundary', value: -2147483648, applicableTypes: ['INT', 'INTEGER'] },
          { type: 'boundary', value: 9223372036854775807, applicableTypes: ['BIGINT'] }
        );
        break;

      case 'SMALLINT':
        cases.push(
          { type: 'boundary', value: 0, applicableTypes: ['SMALLINT'] },
          { type: 'boundary', value: 32767, applicableTypes: ['SMALLINT'] },
          { type: 'boundary', value: -32768, applicableTypes: ['SMALLINT'] }
        );
        break;

      case 'TINYINT':
        cases.push(
          { type: 'boundary', value: 0, applicableTypes: ['TINYINT'] },
          { type: 'boundary', value: 255, applicableTypes: ['TINYINT'] }
        );
        break;

      case 'DECIMAL':
      case 'NUMERIC':
      case 'FLOAT':
      case 'DOUBLE':
      case 'REAL':
        cases.push(
          { type: 'boundary', value: 0, applicableTypes: ['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'boundary', value: 0.0, applicableTypes: ['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'boundary', value: -0.0, applicableTypes: ['FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'boundary', value: 0.000001, applicableTypes: ['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'boundary', value: -0.000001, applicableTypes: ['DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'special', value: Number.MAX_VALUE, applicableTypes: ['FLOAT', 'DOUBLE', 'REAL'] },
          { type: 'special', value: Number.MIN_VALUE, applicableTypes: ['FLOAT', 'DOUBLE', 'REAL'] }
        );
        break;

      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
      case 'STRING':
        cases.push(
          { type: 'empty', value: '', applicableTypes: ['VARCHAR', 'CHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: ' ', applicableTypes: ['VARCHAR', 'CHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '  ', applicableTypes: ['VARCHAR', 'CHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '\n', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '\t', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '\'', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '"', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '\\', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: 'NULL', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: 'null', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '<script>alert("xss")</script>', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: "'; DROP TABLE users; --", applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '../../etc/passwd', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '\u0000', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '😀😁😂', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: 'é á í ó ú', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] },
          { type: 'special', value: '中文测试', applicableTypes: ['VARCHAR', 'TEXT', 'STRING'] }
        );
        break;

      case 'DATE':
        cases.push(
          { type: 'boundary', value: '1970-01-01', applicableTypes: ['DATE'] },
          { type: 'boundary', value: '1900-01-01', applicableTypes: ['DATE'] },
          { type: 'boundary', value: '2038-01-19', applicableTypes: ['DATE'] },
          { type: 'boundary', value: '9999-12-31', applicableTypes: ['DATE'] },
          { type: 'special', value: '2000-02-29', applicableTypes: ['DATE'] },
          { type: 'special', value: '2001-02-28', applicableTypes: ['DATE'] }
        );
        break;

      case 'DATETIME':
      case 'TIMESTAMP':
        cases.push(
          { type: 'boundary', value: '1970-01-01T00:00:00Z', applicableTypes: ['DATETIME', 'TIMESTAMP'] },
          { type: 'boundary', value: '1900-01-01T00:00:00Z', applicableTypes: ['DATETIME', 'TIMESTAMP'] },
          { type: 'boundary', value: '2038-01-19T03:14:07Z', applicableTypes: ['DATETIME', 'TIMESTAMP'] },
          { type: 'boundary', value: '9999-12-31T23:59:59Z', applicableTypes: ['DATETIME', 'TIMESTAMP'] },
          { type: 'special', value: '2000-02-29T23:59:59Z', applicableTypes: ['DATETIME', 'TIMESTAMP'] }
        );
        break;

      case 'TIME':
        cases.push(
          { type: 'boundary', value: '00:00:00', applicableTypes: ['TIME'] },
          { type: 'boundary', value: '23:59:59', applicableTypes: ['TIME'] },
          { type: 'special', value: '12:00:00', applicableTypes: ['TIME'] }
        );
        break;

      case 'BOOLEAN':
      case 'BOOL':
        cases.push(
          { type: 'boundary', value: true, applicableTypes: ['BOOLEAN', 'BOOL'] },
          { type: 'boundary', value: false, applicableTypes: ['BOOLEAN', 'BOOL'] }
        );
        break;

      case 'JSON':
      case 'JSONB':
        cases.push(
          { type: 'empty', value: '{}', applicableTypes: ['JSON', 'JSONB'] },
          { type: 'empty', value: '[]', applicableTypes: ['JSON', 'JSONB'] },
          { type: 'special', value: '{"key": null}', applicableTypes: ['JSON', 'JSONB'] },
          { type: 'special', value: '{"nested": {"deeply": {"key": "value"}}}', applicableTypes: ['JSON', 'JSONB'] },
          { type: 'special', value: '[1, 2, 3, 4, 5]', applicableTypes: ['JSON', 'JSONB'] }
        );
        break;

      case 'UUID':
        cases.push(
          { type: 'special', value: '00000000-0000-0000-0000-000000000000', applicableTypes: ['UUID'] },
          { type: 'special', value: 'ffffffff-ffff-ffff-ffff-ffffffffffff', applicableTypes: ['UUID'] }
        );
        break;

      case 'BLOB':
      case 'BINARY':
        cases.push(
          { type: 'empty', value: '', applicableTypes: ['BLOB', 'BINARY'] },
          { type: 'special', value: '00', applicableTypes: ['BLOB', 'BINARY'] },
          { type: 'special', value: 'ff', applicableTypes: ['BLOB', 'BINARY'] }
        );
        break;
    }

    return cases;
  }

  /**
   * Get statistics about injected edge cases
   */
  public getStatistics(records: GeneratedRecord[], columns: ColumnDefinition[]): {
    totalRecords: number;
    modifiedRecords: number;
    edgeCasesByType: Record<string, number>;
  } {
    const stats = {
      totalRecords: records.length,
      modifiedRecords: 0,
      edgeCasesByType: {} as Record<string, number>
    };

    for (const record of records) {
      for (const column of columns) {
        const value = record[column.name];
        const edgeCases = this.getEdgeCasesForType(column.type);

        for (const edgeCase of edgeCases) {
          if (value === edgeCase.value) {
            stats.modifiedRecords++;
            stats.edgeCasesByType[edgeCase.type] = (stats.edgeCasesByType[edgeCase.type] || 0) + 1;
            break;
          }
        }
      }
    }

    return stats;
  }

  /**
   * Reset the injector state
   */
  public reset(): void {
    this.callCount = 0;
    if (this.seed !== undefined) {
      this.random = this.seededRandom(this.seed);
    }
  }
}
