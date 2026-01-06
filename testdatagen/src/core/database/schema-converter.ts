import { DatabaseSchema, DatabaseTable, DatabaseForeignKey } from './types';
import { SchemaDefinition, TableSchema, Constraint } from '../../types';

export class SchemaConverter {
  static databaseSchemaToSchemaDefinition(dbSchema: DatabaseSchema): SchemaDefinition {
    const tables: TableSchema[] = dbSchema.tables.map(dbTable => this.convertTable(dbTable));
    return { tables };
  }

  private static convertTable(dbTable: DatabaseTable): TableSchema {
    const constraints: Constraint[] = [];

    const pkColumns = dbTable.columns.filter(col => col.isPrimaryKey).map(col => col.name);
    if (pkColumns.length > 0) {
      constraints.push({
        type: 'PRIMARY_KEY',
        columns: pkColumns
      });
    }

    for (const fk of dbTable.foreignKeys) {
      constraints.push({
        type: 'FOREIGN_KEY',
        columns: [fk.column],
        referencedTable: fk.referencedTable,
        referencedColumns: [fk.referencedColumn],
        onDelete: fk.onDelete,
        onUpdate: fk.onUpdate
      });
    }

    for (const uniqueConstraint of dbTable.uniqueConstraints) {
      constraints.push({
        type: 'UNIQUE',
        columns: uniqueConstraint
      });
    }

    for (const checkConstraint of dbTable.checkConstraints) {
      constraints.push({
        type: 'CHECK',
        expression: checkConstraint,
        columns: []
      });
    }

    return {
      name: dbTable.name,
      columns: dbTable.columns.map(col => ({
        name: col.name,
        type: col.type as any,
        nullable: col.nullable,
        defaultValue: col.defaultValue,
        length: col.maxLength,
        precision: col.precision,
        scale: col.scale
      })),
      constraints
    };
  }
}
