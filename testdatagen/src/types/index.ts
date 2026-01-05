/**
 * Type definitions for the test data generation tool
 */

export type DataType =
  | 'INT' | 'INTEGER' | 'BIGINT' | 'SMALLINT' | 'TINYINT'
  | 'VARCHAR' | 'CHAR' | 'TEXT' | 'STRING'
  | 'DECIMAL' | 'NUMERIC' | 'FLOAT' | 'DOUBLE' | 'REAL'
  | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'TIME'
  | 'BOOLEAN' | 'BOOL'
  | 'JSON' | 'JSONB'
  | 'UUID'
  | 'BLOB' | 'BINARY';

export interface ColumnDefinition {
  name: string;
  type: DataType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  comment?: string;
}

export interface PrimaryKeyConstraint {
  type: 'PRIMARY_KEY';
  columns: string[];
  name?: string;
}

export interface ForeignKeyConstraint {
  type: 'FOREIGN_KEY';
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  name?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface UniqueConstraint {
  type: 'UNIQUE';
  columns: string[];
  name?: string;
}

export interface CheckConstraint {
  type: 'CHECK';
  expression: string;
  name?: string;
  columns: string[];
}

export type Constraint =
  | PrimaryKeyConstraint
  | ForeignKeyConstraint
  | UniqueConstraint
  | CheckConstraint;

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  constraints: Constraint[];
  comment?: string;
}

export interface SchemaDefinition {
  tables: TableSchema[];
}

export interface GenerationOptions {
  count: number;
  seed?: number;
  locale?: string;
  format?: 'sql' | 'json' | 'csv';
  output?: string;
  edgeCases?: number;
  validate?: boolean;
}

export interface GeneratedRecord {
  [columnName: string]: any;
}

export interface TableData {
  table: string;
  records: GeneratedRecord[];
}

export interface ValidationResult {
  valid: boolean;
  table: string;
  errors: ValidationError[];
}

export interface ValidationError {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'NOT_NULL' | 'CHECK' | 'DATA_TYPE';
  message: string;
  rowIndex?: number;
  columnName?: string;
  constraint?: string;
}

export interface GenerationReport {
  timestamp: string;
  schema: string;
  recordsGenerated: number;
  tablesGenerated: number;
  validationResults: ValidationResult[];
  duration: number;
  options: GenerationOptions;
}

export interface ValueGenerator {
  generate(column: ColumnDefinition, context: GenerationContext): any;
}

export interface GenerationContext {
  rowIndex: number;
  tableName: string;
  allData: Map<string, GeneratedRecord[]>;
  existingValues: Map<string, Set<any>>;
  seed?: number;
}

export interface ConstraintValidator {
  validate(
    table: TableSchema,
    records: GeneratedRecord[]
  ): ValidationResult;
}

export interface Exporter {
  export(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string;
}
