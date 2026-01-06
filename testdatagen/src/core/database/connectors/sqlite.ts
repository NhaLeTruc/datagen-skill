import Database from 'better-sqlite3';
import { DatabaseConnector } from '../connector';
import {
  DatabaseConnectionConfig,
  DatabaseSchema,
  DatabaseTable,
  DatabaseColumn,
  DatabaseForeignKey,
  IntrospectionOptions
} from '../types';

export class SQLiteConnector extends DatabaseConnector {
  private db: Database.Database | null = null;

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (!this.config.filename) {
      throw new Error('SQLite filename is required');
    }

    try {
      this.db = new Database(this.config.filename, {
        readonly: false,
        fileMustExist: false
      });

      this.db.pragma('foreign_keys = ON');

      await this.testConnection();
      this.connected = true;
    } catch (error) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      throw new Error(`Failed to connect to SQLite: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  async introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema> {
    this.validateConnection();

    const tables = await this.getTables(options);
    const schema: DatabaseSchema = { tables: [] };

    for (const tableName of tables) {
      const table = await this.introspectTable(tableName);
      schema.tables.push(table);
    }

    return schema;
  }

  private async getTables(options?: IntrospectionOptions): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `;

    if (!options?.includeSystemTables) {
      query += ` AND name NOT LIKE 'sqlite_%'`;
    }

    const rows = this.db.prepare(query).all() as { name: string }[];
    let tables = rows.map(row => row.name);

    if (options?.includeTables && options.includeTables.length > 0) {
      tables = tables.filter(t => options.includeTables!.includes(t));
    }

    if (options?.excludeTables && options.excludeTables.length > 0) {
      tables = tables.filter(t => !options.excludeTables!.includes(t));
    }

    return tables.sort();
  }

  private async introspectTable(tableName: string): Promise<DatabaseTable> {
    const columns = await this.getColumns(tableName);
    const foreignKeys = await this.getForeignKeys(tableName);
    const uniqueConstraints = await this.getUniqueConstraints(tableName);
    const checkConstraints = await this.getCheckConstraints(tableName);

    return {
      name: tableName,
      columns,
      foreignKeys,
      uniqueConstraints,
      checkConstraints
    };
  }

  private async getColumns(tableName: string): Promise<DatabaseColumn[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const pragmaInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

    const primaryKeys = pragmaInfo.filter(col => col.pk > 0).map(col => col.name);

    const uniqueColumns = new Set<string>();
    const indexList = this.db.prepare(`PRAGMA index_list(${tableName})`).all() as any[];

    for (const index of indexList) {
      if (index.unique === 1) {
        const indexInfo = this.db.prepare(`PRAGMA index_info(${index.name})`).all() as any[];
        if (indexInfo.length === 1) {
          uniqueColumns.add(indexInfo[0].name);
        }
      }
    }

    return pragmaInfo.map(col => ({
      name: col.name,
      type: this.mapSQLiteType(col.type),
      nullable: col.notnull === 0,
      defaultValue: col.dflt_value,
      isPrimaryKey: primaryKeys.includes(col.name),
      isUnique: uniqueColumns.has(col.name),
      maxLength: this.extractMaxLength(col.type),
      precision: undefined,
      scale: undefined
    }));
  }

  private async getForeignKeys(tableName: string): Promise<DatabaseForeignKey[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const foreignKeyList = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as any[];

    return foreignKeyList.map(fk => ({
      column: fk.from,
      referencedTable: fk.table,
      referencedColumn: fk.to,
      onDelete: this.mapReferentialAction(fk.on_delete),
      onUpdate: this.mapReferentialAction(fk.on_update)
    }));
  }

  private async getUniqueConstraints(tableName: string): Promise<string[][]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const uniqueConstraints: string[][] = [];
    const indexList = this.db.prepare(`PRAGMA index_list(${tableName})`).all() as any[];

    for (const index of indexList) {
      if (index.unique === 1 && index.origin === 'u') {
        const indexInfo = this.db.prepare(`PRAGMA index_info(${index.name})`).all() as any[];
        const columns = indexInfo.map((info: any) => info.name);
        uniqueConstraints.push(columns);
      }
    }

    return uniqueConstraints;
  }

  private async getCheckConstraints(tableName: string): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sql = this.db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`).get(tableName) as { sql: string } | undefined;

    if (!sql || !sql.sql) {
      return [];
    }

    const checkConstraints: string[] = [];
    const checkRegex = /CHECK\s*\(([^)]+)\)/gi;
    let match;

    while ((match = checkRegex.exec(sql.sql)) !== null) {
      checkConstraints.push(match[1].trim());
    }

    return checkConstraints;
  }

  private mapSQLiteType(sqliteType: string): string {
    const type = sqliteType.toUpperCase();

    if (type.includes('INT')) return 'INT';
    if (type.includes('CHAR') || type.includes('CLOB') || type.includes('TEXT')) return 'VARCHAR';
    if (type.includes('BLOB')) return 'BLOB';
    if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) return 'FLOAT';
    if (type.includes('NUMERIC') || type.includes('DECIMAL')) return 'DECIMAL';
    if (type.includes('BOOL')) return 'BOOLEAN';
    if (type.includes('DATE')) return 'DATE';
    if (type.includes('TIME')) return 'TIMESTAMP';

    return 'VARCHAR';
  }

  private extractMaxLength(type: string): number | undefined {
    const match = type.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private mapReferentialAction(action: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' {
    const actionMap: Record<string, 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'> = {
      'CASCADE': 'CASCADE',
      'SET NULL': 'SET NULL',
      'RESTRICT': 'RESTRICT',
      'NO ACTION': 'NO ACTION'
    };

    return actionMap[action.toUpperCase()] || 'NO ACTION';
  }
}
