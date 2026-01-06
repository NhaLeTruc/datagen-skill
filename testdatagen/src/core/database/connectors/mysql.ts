import mysql from 'mysql2/promise';
import { DatabaseConnector } from '../connector';
import {
  DatabaseConnectionConfig,
  DatabaseSchema,
  DatabaseTable,
  DatabaseColumn,
  DatabaseForeignKey,
  IntrospectionOptions
} from '../types';

export class MySQLConnector extends DatabaseConnector {
  private pool: mysql.Pool | null = null;

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.pool = mysql.createPool({
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? {} : undefined,
      connectTimeout: this.config.connectionTimeout || 5000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    try {
      await this.testConnection();
      this.connected = true;
    } catch (error) {
      await this.pool.end();
      this.pool = null;
      throw new Error(`Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
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
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    let query = `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `;

    const params: any[] = [this.config.database];

    if (!options?.includeSystemTables) {
      query += ` AND TABLE_NAME NOT LIKE 'mysql_%'`;
    }

    if (options?.includeTables && options.includeTables.length > 0) {
      const placeholders = options.includeTables.map(() => '?').join(',');
      query += ` AND TABLE_NAME IN (${placeholders})`;
      params.push(...options.includeTables);
    }

    if (options?.excludeTables && options.excludeTables.length > 0) {
      const placeholders = options.excludeTables.map(() => '?').join(',');
      query += ` AND TABLE_NAME NOT IN (${placeholders})`;
      params.push(...options.excludeTables);
    }

    query += ` ORDER BY TABLE_NAME`;

    const [rows] = await this.pool.query<any[]>(query, params);
    return rows.map(row => row.TABLE_NAME);
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
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        c.COLUMN_KEY,
        c.EXTRA
      FROM information_schema.COLUMNS c
      WHERE c.TABLE_NAME = ?
        AND c.TABLE_SCHEMA = ?
      ORDER BY c.ORDINAL_POSITION
    `;

    const [rows] = await this.pool.query<any[]>(query, [tableName, this.config.database]);

    return rows.map(row => ({
      name: row.COLUMN_NAME,
      type: this.mapMySQLType(row.DATA_TYPE),
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT,
      isPrimaryKey: row.COLUMN_KEY === 'PRI',
      isUnique: row.COLUMN_KEY === 'UNI',
      maxLength: row.CHARACTER_MAXIMUM_LENGTH,
      precision: row.NUMERIC_PRECISION,
      scale: row.NUMERIC_SCALE
    }));
  }

  private async getForeignKeys(tableName: string): Promise<DatabaseForeignKey[]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.DELETE_RULE,
        rc.UPDATE_RULE
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_NAME = ?
        AND kcu.TABLE_SCHEMA = ?
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `;

    const [rows] = await this.pool.query<any[]>(query, [tableName, this.config.database]);

    return rows.map(row => ({
      column: row.COLUMN_NAME,
      referencedTable: row.REFERENCED_TABLE_NAME,
      referencedColumn: row.REFERENCED_COLUMN_NAME,
      onDelete: this.mapReferentialAction(row.DELETE_RULE),
      onUpdate: this.mapReferentialAction(row.UPDATE_RULE)
    }));
  }

  private async getUniqueConstraints(tableName: string): Promise<string[][]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT
        tc.CONSTRAINT_NAME,
        GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns
      FROM information_schema.TABLE_CONSTRAINTS tc
      JOIN information_schema.KEY_COLUMN_USAGE kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
      WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
        AND tc.TABLE_NAME = ?
        AND tc.TABLE_SCHEMA = ?
      GROUP BY tc.CONSTRAINT_NAME
    `;

    const [rows] = await this.pool.query<any[]>(query, [tableName, this.config.database]);
    return rows.map(row => row.columns.split(','));
  }

  private async getCheckConstraints(tableName: string): Promise<string[]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT cc.CHECK_CLAUSE
      FROM information_schema.CHECK_CONSTRAINTS cc
      JOIN information_schema.TABLE_CONSTRAINTS tc
        ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        AND cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
      WHERE tc.TABLE_NAME = ?
        AND tc.TABLE_SCHEMA = ?
    `;

    const [rows] = await this.pool.query<any[]>(query, [tableName, this.config.database]);
    return rows.map(row => row.CHECK_CLAUSE);
  }

  private mapMySQLType(mysqlType: string): string {
    const typeMap: Record<string, string> = {
      'int': 'INT',
      'tinyint': 'TINYINT',
      'smallint': 'SMALLINT',
      'mediumint': 'INT',
      'bigint': 'BIGINT',
      'decimal': 'DECIMAL',
      'numeric': 'DECIMAL',
      'float': 'FLOAT',
      'double': 'DOUBLE',
      'varchar': 'VARCHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'tinytext': 'TEXT',
      'mediumtext': 'TEXT',
      'longtext': 'TEXT',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'year': 'INT',
      'json': 'JSON',
      'blob': 'BLOB',
      'tinyblob': 'BLOB',
      'mediumblob': 'BLOB',
      'longblob': 'BLOB',
      'binary': 'BINARY',
      'varbinary': 'VARBINARY',
      'enum': 'VARCHAR',
      'set': 'VARCHAR'
    };

    return typeMap[mysqlType.toLowerCase()] || mysqlType.toUpperCase();
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
