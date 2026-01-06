import { Pool, PoolClient } from 'pg';
import { DatabaseConnector } from '../connector';
import {
  DatabaseConnectionConfig,
  DatabaseSchema,
  DatabaseTable,
  DatabaseColumn,
  DatabaseForeignKey,
  IntrospectionOptions
} from '../types';

export class PostgreSQLConnector extends DatabaseConnector {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.pool = new Pool({
      host: this.config.host || 'localhost',
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.config.connectionTimeout || 5000
    });

    try {
      await this.testConnection();
      this.connected = true;
    } catch (error) {
      await this.pool.end();
      this.pool = null;
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`);
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
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
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
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    if (!options?.includeSystemTables) {
      query += ` AND table_name NOT LIKE 'pg_%'`;
    }

    if (options?.includeTables && options.includeTables.length > 0) {
      const tableList = options.includeTables.map(t => `'${t}'`).join(',');
      query += ` AND table_name IN (${tableList})`;
    }

    if (options?.excludeTables && options.excludeTables.length > 0) {
      const excludeList = options.excludeTables.map(t => `'${t}'`).join(',');
      query += ` AND table_name NOT IN (${excludeList})`;
    }

    query += ` ORDER BY table_name`;

    const result = await this.pool.query(query);
    return result.rows.map(row => row.table_name);
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
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_name = $1
          AND tc.table_schema = 'public'
      ) uq ON c.column_name = uq.column_name
      WHERE c.table_name = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `;

    const result = await this.pool.query(query, [tableName]);

    return result.rows.map(row => ({
      name: row.column_name,
      type: this.mapPostgreSQLType(row.data_type),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isUnique: row.is_unique,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision,
      scale: row.numeric_scale
    }));
  }

  private async getForeignKeys(tableName: string): Promise<DatabaseForeignKey[]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public'
    `;

    const result = await this.pool.query(query, [tableName]);

    return result.rows.map(row => ({
      column: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
      onDelete: this.mapReferentialAction(row.delete_rule),
      onUpdate: this.mapReferentialAction(row.update_rule)
    }));
  }

  private async getUniqueConstraints(tableName: string): Promise<string[][]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT
        tc.constraint_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = $1
        AND tc.table_schema = 'public'
      GROUP BY tc.constraint_name
    `;

    const result = await this.pool.query(query, [tableName]);
    return result.rows.map(row => row.columns);
  }

  private async getCheckConstraints(tableName: string): Promise<string[]> {
    if (!this.pool) {
      throw new Error('Pool not initialized');
    }

    const query = `
      SELECT check_clause
      FROM information_schema.check_constraints cc
      JOIN information_schema.table_constraints tc
        ON cc.constraint_name = tc.constraint_name
        AND cc.constraint_schema = tc.table_schema
      WHERE tc.table_name = $1
        AND tc.table_schema = 'public'
    `;

    const result = await this.pool.query(query, [tableName]);
    return result.rows.map(row => row.check_clause);
  }

  private mapPostgreSQLType(pgType: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'INT',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'numeric': 'DECIMAL',
      'decimal': 'DECIMAL',
      'real': 'FLOAT',
      'double precision': 'DOUBLE',
      'character varying': 'VARCHAR',
      'varchar': 'VARCHAR',
      'character': 'CHAR',
      'char': 'CHAR',
      'text': 'TEXT',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'timestamp without time zone': 'TIMESTAMP',
      'timestamp with time zone': 'TIMESTAMP',
      'time without time zone': 'TIME',
      'time with time zone': 'TIME',
      'json': 'JSON',
      'jsonb': 'JSON',
      'uuid': 'UUID',
      'bytea': 'BLOB'
    };

    return typeMap[pgType.toLowerCase()] || pgType.toUpperCase();
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
