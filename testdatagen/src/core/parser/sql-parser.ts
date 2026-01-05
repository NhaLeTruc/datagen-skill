import { Parser } from 'node-sql-parser';
import {
  SchemaDefinition,
  TableSchema,
  ColumnDefinition,
  DataType,
  Constraint,
  PrimaryKeyConstraint,
  ForeignKeyConstraint,
  UniqueConstraint,
  CheckConstraint
} from '../../types';

export class SQLParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Parse SQL DDL statements and extract schema definition
   */
  public parseSchema(sql: string): SchemaDefinition {
    const tables: TableSchema[] = [];

    const statements = this.splitStatements(sql);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
        try {
          const table = this.parseCreateTable(trimmed);
          if (table) {
            tables.push(table);
          }
        } catch (error) {
          console.error(`Failed to parse table: ${error}`);
        }
      }
    }

    return { tables };
  }

  /**
   * Split SQL into individual statements
   */
  private splitStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = '';
        current += char;
      } else if (char === ';' && !inString) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements;
  }

  /**
   * Parse a CREATE TABLE statement
   */
  private parseCreateTable(sql: string): TableSchema | null {
    try {
      const ast = this.parser.astify(sql, { database: 'PostgresQL' });

      if (!ast || (Array.isArray(ast) && ast.length === 0)) {
        return null;
      }

      const createStmt = Array.isArray(ast) ? ast[0] : ast;

      if (createStmt.type !== 'create' || createStmt.keyword !== 'table') {
        return null;
      }

      const tableName = this.extractTableName(createStmt.table);
      const columns: ColumnDefinition[] = [];
      const constraints: Constraint[] = [];

      if (createStmt.create_definitions) {
        for (const def of createStmt.create_definitions) {
          if (def.resource === 'column') {
            const column = this.parseColumnDefinition(def);
            columns.push(column);

            const columnConstraints = this.extractColumnConstraints(def, column.name);
            constraints.push(...columnConstraints);
          } else if (def.resource === 'constraint') {
            const constraint = this.parseConstraint(def);
            if (constraint) {
              constraints.push(constraint);
            }
          }
        }
      }

      return {
        name: tableName,
        columns,
        constraints
      };
    } catch (error) {
      return this.parseCreateTableManually(sql);
    }
  }

  /**
   * Manual parser as fallback for complex SQL
   */
  private parseCreateTableManually(sql: string): TableSchema | null {
    const tableNameMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?\s*\(/i);
    if (!tableNameMatch) return null;

    const tableName = tableNameMatch[1];
    const columns: ColumnDefinition[] = [];
    const constraints: Constraint[] = [];

    const bodyMatch = sql.match(/\(([\s\S]+)\)/);
    if (!bodyMatch) return null;

    const body = bodyMatch[1];
    const lines = this.splitTableDefinitions(body);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toUpperCase().startsWith('PRIMARY KEY')) {
        const pk = this.parsePrimaryKeyManual(trimmed);
        if (pk) constraints.push(pk);
      } else if (trimmed.toUpperCase().startsWith('FOREIGN KEY')) {
        const fk = this.parseForeignKeyManual(trimmed);
        if (fk) constraints.push(fk);
      } else if (trimmed.toUpperCase().startsWith('UNIQUE')) {
        const unique = this.parseUniqueManual(trimmed);
        if (unique) constraints.push(unique);
      } else if (trimmed.toUpperCase().startsWith('CHECK')) {
        const check = this.parseCheckManual(trimmed);
        if (check) constraints.push(check);
      } else if (trimmed.toUpperCase().startsWith('CONSTRAINT')) {
        const constraint = this.parseNamedConstraintManual(trimmed);
        if (constraint) constraints.push(constraint);
      } else {
        const column = this.parseColumnManual(trimmed);
        if (column) {
          columns.push(column.column);
          constraints.push(...column.constraints);
        }
      }
    }

    return {
      name: tableName,
      columns,
      constraints
    };
  }

  /**
   * Split table definitions by commas (respecting nested parentheses)
   */
  private splitTableDefinitions(body: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < body.length; i++) {
      const char = body[i];

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === '(' && !inString) {
        parenDepth++;
        current += char;
      } else if (char === ')' && !inString) {
        parenDepth--;
        current += char;
      } else if (char === ',' && parenDepth === 0 && !inString) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Parse column definition manually
   */
  private parseColumnManual(line: string): { column: ColumnDefinition; constraints: Constraint[] } | null {
    const constraints: Constraint[] = [];

    const match = line.match(/^(?:`|")?(\w+)(?:`|")?\s+(\w+)(?:\((\d+)(?:,\s*(\d+))?\))?/i);
    if (!match) return null;

    const [, name, typeStr, lengthStr, scaleStr] = match;
    const type = this.normalizeDataType(typeStr);

    const column: ColumnDefinition = {
      name,
      type,
      nullable: !line.toUpperCase().includes('NOT NULL')
    };

    if (lengthStr) {
      if (scaleStr) {
        column.precision = parseInt(lengthStr, 10);
        column.scale = parseInt(scaleStr, 10);
      } else {
        column.length = parseInt(lengthStr, 10);
      }
    }

    if (line.toUpperCase().includes('PRIMARY KEY')) {
      constraints.push({
        type: 'PRIMARY_KEY',
        columns: [name]
      });
    }

    if (line.toUpperCase().includes('UNIQUE')) {
      constraints.push({
        type: 'UNIQUE',
        columns: [name]
      });
    }

    if (line.toUpperCase().includes('AUTO_INCREMENT') || line.toUpperCase().includes('AUTOINCREMENT')) {
      column.autoIncrement = true;
    }

    const defaultMatch = line.match(/DEFAULT\s+(.+?)(?:\s+|$)/i);
    if (defaultMatch) {
      column.defaultValue = this.parseDefaultValue(defaultMatch[1]);
    }

    return { column, constraints };
  }

  /**
   * Parse PRIMARY KEY constraint manually
   */
  private parsePrimaryKeyManual(line: string): PrimaryKeyConstraint | null {
    const match = line.match(/PRIMARY\s+KEY\s*\((.+?)\)/i);
    if (!match) return null;

    const columns = match[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    return {
      type: 'PRIMARY_KEY',
      columns
    };
  }

  /**
   * Parse FOREIGN KEY constraint manually
   */
  private parseForeignKeyManual(line: string): ForeignKeyConstraint | null {
    const match = line.match(/FOREIGN\s+KEY\s*\((.+?)\)\s+REFERENCES\s+(\w+)\s*\((.+?)\)/i);
    if (!match) return null;

    const columns = match[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    const referencedTable = match[2];
    const referencedColumns = match[3].split(',').map(c => c.trim().replace(/[`"]/g, ''));

    const fk: ForeignKeyConstraint = {
      type: 'FOREIGN_KEY',
      columns,
      referencedTable,
      referencedColumns
    };

    const onDeleteMatch = line.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)/i);
    if (onDeleteMatch) {
      fk.onDelete = onDeleteMatch[1].toUpperCase().replace(/\s+/g, ' ') as any;
    }

    const onUpdateMatch = line.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)/i);
    if (onUpdateMatch) {
      fk.onUpdate = onUpdateMatch[1].toUpperCase().replace(/\s+/g, ' ') as any;
    }

    return fk;
  }

  /**
   * Parse UNIQUE constraint manually
   */
  private parseUniqueManual(line: string): UniqueConstraint | null {
    const match = line.match(/UNIQUE\s*\((.+?)\)/i);
    if (!match) return null;

    const columns = match[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    return {
      type: 'UNIQUE',
      columns
    };
  }

  /**
   * Parse CHECK constraint manually
   */
  private parseCheckManual(line: string): CheckConstraint | null {
    const match = line.match(/CHECK\s*\((.+)\)/i);
    if (!match) return null;

    const expression = match[1].trim();
    const columns = this.extractColumnsFromExpression(expression);

    return {
      type: 'CHECK',
      expression,
      columns
    };
  }

  /**
   * Parse named constraint manually
   */
  private parseNamedConstraintManual(line: string): Constraint | null {
    const nameMatch = line.match(/CONSTRAINT\s+(\w+)\s+(.+)/i);
    if (!nameMatch) return null;

    const [, name, constraintDef] = nameMatch;

    if (constraintDef.toUpperCase().startsWith('PRIMARY KEY')) {
      const pk = this.parsePrimaryKeyManual(constraintDef);
      if (pk) pk.name = name;
      return pk;
    } else if (constraintDef.toUpperCase().startsWith('FOREIGN KEY')) {
      const fk = this.parseForeignKeyManual(constraintDef);
      if (fk) fk.name = name;
      return fk;
    } else if (constraintDef.toUpperCase().startsWith('UNIQUE')) {
      const unique = this.parseUniqueManual(constraintDef);
      if (unique) unique.name = name;
      return unique;
    } else if (constraintDef.toUpperCase().startsWith('CHECK')) {
      const check = this.parseCheckManual(constraintDef);
      if (check) check.name = name;
      return check;
    }

    return null;
  }

  /**
   * Extract columns referenced in a CHECK expression
   */
  private extractColumnsFromExpression(expression: string): string[] {
    const columns: Set<string> = new Set();
    const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    const keywords = new Set(['AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'NULL', 'TRUE', 'FALSE']);

    while ((match = columnPattern.exec(expression)) !== null) {
      const word = match[1].toUpperCase();
      if (!keywords.has(word)) {
        columns.add(match[1]);
      }
    }

    return Array.from(columns);
  }

  /**
   * Extract table name from AST
   */
  private extractTableName(tableObj: any): string {
    if (typeof tableObj === 'string') {
      return tableObj;
    }
    if (tableObj && tableObj.table) {
      return tableObj.table;
    }
    return 'unknown_table';
  }

  /**
   * Parse column definition from AST
   */
  private parseColumnDefinition(def: any): ColumnDefinition {
    const column: ColumnDefinition = {
      name: def.column.column,
      type: this.normalizeDataType(def.definition.dataType),
      nullable: true
    };

    if (def.definition.length !== undefined) {
      column.length = def.definition.length;
    }

    if (def.definition.scale !== undefined) {
      column.scale = def.definition.scale;
      column.precision = def.definition.length;
    }

    if (def.nullable && def.nullable.value === 'not null') {
      column.nullable = false;
    }

    if (def.auto_increment) {
      column.autoIncrement = true;
    }

    if (def.default_val) {
      column.defaultValue = this.parseDefaultValue(def.default_val.value);
    }

    return column;
  }

  /**
   * Extract constraints from column definition
   */
  private extractColumnConstraints(def: any, columnName: string): Constraint[] {
    const constraints: Constraint[] = [];

    if (def.unique) {
      constraints.push({
        type: 'UNIQUE',
        columns: [columnName]
      });
    }

    if (def.primary_key) {
      constraints.push({
        type: 'PRIMARY_KEY',
        columns: [columnName]
      });
    }

    return constraints;
  }

  /**
   * Parse constraint from AST
   */
  private parseConstraint(def: any): Constraint | null {
    const constraintType = def.constraint_type?.toUpperCase();

    switch (constraintType) {
      case 'PRIMARY KEY':
        return {
          type: 'PRIMARY_KEY',
          columns: def.definition.map((d: any) => d.column),
          name: def.constraint
        };

      case 'FOREIGN KEY':
        return {
          type: 'FOREIGN_KEY',
          columns: def.definition.map((d: any) => d.column),
          referencedTable: def.reference_definition.table.table,
          referencedColumns: def.reference_definition.definition.map((d: any) => d.column),
          name: def.constraint,
          onDelete: def.reference_definition.on_delete,
          onUpdate: def.reference_definition.on_update
        };

      case 'UNIQUE':
        return {
          type: 'UNIQUE',
          columns: def.definition.map((d: any) => d.column),
          name: def.constraint
        };

      case 'CHECK':
        const expression = this.astToExpression(def.definition);
        return {
          type: 'CHECK',
          expression,
          columns: this.extractColumnsFromExpression(expression),
          name: def.constraint
        };

      default:
        return null;
    }
  }

  /**
   * Convert AST to expression string
   */
  private astToExpression(ast: any): string {
    if (!ast) return '';
    if (typeof ast === 'string') return ast;
    if (typeof ast === 'number') return ast.toString();
    return JSON.stringify(ast);
  }

  /**
   * Normalize data type to standard format
   */
  private normalizeDataType(type: string): DataType {
    const normalized = type.toUpperCase().replace(/\s+/g, '');

    if (normalized.includes('INT')) {
      if (normalized.includes('BIG')) return 'BIGINT';
      if (normalized.includes('SMALL')) return 'SMALLINT';
      if (normalized.includes('TINY')) return 'TINYINT';
      return 'INTEGER';
    }

    if (normalized.includes('CHAR') || normalized.includes('VARCHAR')) {
      return normalized.includes('VAR') ? 'VARCHAR' : 'CHAR';
    }

    if (normalized.includes('TEXT') || normalized.includes('STRING')) {
      return 'TEXT';
    }

    if (normalized.includes('DECIMAL') || normalized.includes('NUMERIC')) {
      return 'DECIMAL';
    }

    if (normalized.includes('FLOAT') || normalized.includes('DOUBLE') || normalized.includes('REAL')) {
      if (normalized.includes('DOUBLE')) return 'DOUBLE';
      if (normalized.includes('REAL')) return 'REAL';
      return 'FLOAT';
    }

    if (normalized.includes('DATE')) {
      if (normalized.includes('TIME')) return 'DATETIME';
      return 'DATE';
    }

    if (normalized.includes('TIME')) {
      if (normalized === 'TIME') return 'TIME';
      return 'TIMESTAMP';
    }

    if (normalized.includes('BOOL')) {
      return 'BOOLEAN';
    }

    if (normalized.includes('JSON')) {
      return normalized.includes('JSONB') ? 'JSONB' : 'JSON';
    }

    if (normalized.includes('UUID')) {
      return 'UUID';
    }

    if (normalized.includes('BLOB') || normalized.includes('BINARY')) {
      return 'BLOB';
    }

    return 'VARCHAR';
  }

  /**
   * Parse default value
   */
  private parseDefaultValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim().replace(/^['"]|['"]$/g, '');

      if (trimmed.toUpperCase() === 'NULL') return null;
      if (trimmed.toUpperCase() === 'TRUE') return true;
      if (trimmed.toUpperCase() === 'FALSE') return false;
      if (!isNaN(Number(trimmed))) return Number(trimmed);

      return trimmed;
    }
    return value;
  }
}
