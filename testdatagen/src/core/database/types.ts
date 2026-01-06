export interface DatabaseConnectionConfig {
  type: 'postgresql' | 'mysql' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  filename?: string;
  ssl?: boolean;
  connectionTimeout?: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isUnique: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface DatabaseForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface DatabaseTable {
  name: string;
  schema?: string;
  columns: DatabaseColumn[];
  foreignKeys: DatabaseForeignKey[];
  uniqueConstraints: string[][];
  checkConstraints: string[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  version?: string;
}

export interface IntrospectionOptions {
  includeTables?: string[];
  excludeTables?: string[];
  includeViews?: boolean;
  includeSystemTables?: boolean;
}
