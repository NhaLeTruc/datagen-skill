import {
  TableSchema,
  ColumnDefinition,
  Constraint,
  PrimaryKeyConstraint,
  ForeignKeyConstraint,
  UniqueConstraint,
  CheckConstraint
} from '../../types';

export interface ConstraintInfo {
  primaryKeys: Map<string, string[]>;
  foreignKeys: ForeignKeyConstraint[];
  uniqueConstraints: Map<string, string[][]>;
  notNullColumns: Map<string, string[]>;
  checkConstraints: Map<string, CheckConstraint[]>;
}

export class ConstraintExtractor {
  /**
   * Extract all constraints from schema
   */
  public extractConstraints(tables: TableSchema[]): ConstraintInfo {
    const primaryKeys = new Map<string, string[]>();
    const foreignKeys: ForeignKeyConstraint[] = [];
    const uniqueConstraints = new Map<string, string[][]>();
    const notNullColumns = new Map<string, string[]>();
    const checkConstraints = new Map<string, CheckConstraint[]>();

    for (const table of tables) {
      const tableName = table.name;

      const notNullCols = table.columns
        .filter(col => !col.nullable)
        .map(col => col.name);

      if (notNullCols.length > 0) {
        notNullColumns.set(tableName, notNullCols);
      }

      const uniqueCols: string[][] = [];
      const checks: CheckConstraint[] = [];

      for (const constraint of table.constraints) {
        switch (constraint.type) {
          case 'PRIMARY_KEY':
            primaryKeys.set(tableName, constraint.columns);
            break;

          case 'FOREIGN_KEY':
            foreignKeys.push({
              ...constraint,
              columns: constraint.columns.map(col => `${tableName}.${col}`)
            } as any);
            break;

          case 'UNIQUE':
            uniqueCols.push(constraint.columns);
            break;

          case 'CHECK':
            checks.push(constraint);
            break;
        }
      }

      if (uniqueCols.length > 0) {
        uniqueConstraints.set(tableName, uniqueCols);
      }

      if (checks.length > 0) {
        checkConstraints.set(tableName, checks);
      }
    }

    return {
      primaryKeys,
      foreignKeys,
      uniqueConstraints,
      notNullColumns,
      checkConstraints
    };
  }

  /**
   * Get primary key columns for a table
   */
  public getPrimaryKey(table: TableSchema): string[] {
    for (const constraint of table.constraints) {
      if (constraint.type === 'PRIMARY_KEY') {
        return constraint.columns;
      }
    }
    return [];
  }

  /**
   * Get foreign keys for a table
   */
  public getForeignKeys(table: TableSchema): ForeignKeyConstraint[] {
    return table.constraints.filter(
      c => c.type === 'FOREIGN_KEY'
    ) as ForeignKeyConstraint[];
  }

  /**
   * Get unique constraints for a table
   */
  public getUniqueConstraints(table: TableSchema): UniqueConstraint[] {
    return table.constraints.filter(
      c => c.type === 'UNIQUE'
    ) as UniqueConstraint[];
  }

  /**
   * Get check constraints for a table
   */
  public getCheckConstraints(table: TableSchema): CheckConstraint[] {
    return table.constraints.filter(
      c => c.type === 'CHECK'
    ) as CheckConstraint[];
  }

  /**
   * Get NOT NULL columns for a table
   */
  public getNotNullColumns(table: TableSchema): string[] {
    return table.columns
      .filter(col => !col.nullable)
      .map(col => col.name);
  }

  /**
   * Check if column is part of primary key
   */
  public isPrimaryKeyColumn(table: TableSchema, columnName: string): boolean {
    const pk = this.getPrimaryKey(table);
    return pk.includes(columnName);
  }

  /**
   * Check if column is part of any foreign key
   */
  public isForeignKeyColumn(table: TableSchema, columnName: string): boolean {
    const fks = this.getForeignKeys(table);
    return fks.some(fk => fk.columns.includes(columnName));
  }

  /**
   * Check if column has unique constraint
   */
  public isUniqueColumn(table: TableSchema, columnName: string): boolean {
    const uniques = this.getUniqueConstraints(table);
    return uniques.some(u => u.columns.includes(columnName));
  }

  /**
   * Get foreign key reference for a column
   */
  public getForeignKeyReference(
    table: TableSchema,
    columnName: string
  ): ForeignKeyConstraint | null {
    const fks = this.getForeignKeys(table);
    for (const fk of fks) {
      const index = fk.columns.indexOf(columnName);
      if (index >= 0) {
        return fk;
      }
    }
    return null;
  }

  /**
   * Check if column is auto-incrementing
   */
  public isAutoIncrement(table: TableSchema, columnName: string): boolean {
    const column = table.columns.find(c => c.name === columnName);
    return column?.autoIncrement === true;
  }

  /**
   * Get column definition
   */
  public getColumn(table: TableSchema, columnName: string): ColumnDefinition | null {
    return table.columns.find(c => c.name === columnName) || null;
  }

  /**
   * Get all columns that reference a specific table
   */
  public getReferencingColumns(
    tables: TableSchema[],
    targetTable: string
  ): Array<{ table: string; column: string; fk: ForeignKeyConstraint }> {
    const references: Array<{ table: string; column: string; fk: ForeignKeyConstraint }> = [];

    for (const table of tables) {
      const fks = this.getForeignKeys(table);
      for (const fk of fks) {
        if (fk.referencedTable === targetTable) {
          for (let i = 0; i < fk.columns.length; i++) {
            references.push({
              table: table.name,
              column: fk.columns[i],
              fk
            });
          }
        }
      }
    }

    return references;
  }

  /**
   * Build dependency graph of tables based on foreign keys
   */
  public buildDependencyGraph(tables: TableSchema[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const table of tables) {
      if (!graph.has(table.name)) {
        graph.set(table.name, new Set());
      }

      const fks = this.getForeignKeys(table);
      for (const fk of fks) {
        if (fk.referencedTable !== table.name) {
          graph.get(table.name)!.add(fk.referencedTable);
        }
      }
    }

    return graph;
  }

  /**
   * Get topological order of tables for generation
   */
  public getGenerationOrder(tables: TableSchema[]): string[] {
    const graph = this.buildDependencyGraph(tables);
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (tableName: string, visiting: Set<string>) => {
      if (visited.has(tableName)) return;
      if (visiting.has(tableName)) {
        return;
      }

      visiting.add(tableName);
      const dependencies = graph.get(tableName) || new Set();

      for (const dep of dependencies) {
        visit(dep, visiting);
      }

      visiting.delete(tableName);
      visited.add(tableName);
      order.push(tableName);
    };

    for (const table of tables) {
      visit(table.name, new Set());
    }

    return order;
  }

  /**
   * Check if table has self-referencing foreign key
   */
  public hasSelfReference(table: TableSchema): boolean {
    const fks = this.getForeignKeys(table);
    return fks.some(fk => fk.referencedTable === table.name);
  }

  /**
   * Detect circular dependencies
   */
  public detectCircularDependencies(tables: TableSchema[]): string[][] {
    const graph = this.buildDependencyGraph(tables);
    const cycles: string[][] = [];

    const findCycles = (
      node: string,
      path: string[],
      visited: Set<string>,
      recStack: Set<string>
    ) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          findCycles(neighbor, [...path], visited, new Set(recStack));
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      recStack.delete(node);
    };

    const visited = new Set<string>();
    for (const table of tables) {
      if (!visited.has(table.name)) {
        findCycles(table.name, [], visited, new Set());
      }
    }

    return cycles;
  }
}
