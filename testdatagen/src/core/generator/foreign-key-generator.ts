import { ColumnDefinition, GenerationContext, ForeignKeyConstraint } from '../../types';

export class ForeignKeyGenerator {
  /**
   * Generate foreign key value by selecting from referenced table's primary keys
   */
  public generate(
    column: ColumnDefinition,
    fk: ForeignKeyConstraint,
    context: GenerationContext
  ): any {
    const referencedData = context.allData.get(fk.referencedTable);

    if (!referencedData || referencedData.length === 0) {
      throw new Error(
        `Cannot generate foreign key for ${context.tableName}.${column.name}: ` +
        `Referenced table ${fk.referencedTable} has no data. ` +
        `Tables must be generated in dependency order.`
      );
    }

    const columnIndex = fk.columns.indexOf(column.name);
    if (columnIndex === -1) {
      throw new Error(
        `Column ${column.name} not found in foreign key constraint columns`
      );
    }

    const referencedColumn = fk.referencedColumns[columnIndex];

    const randomIndex = this.getRandomIndex(referencedData.length, context.seed, context.rowIndex);
    const referencedRecord = referencedData[randomIndex];

    if (!(referencedColumn in referencedRecord)) {
      throw new Error(
        `Referenced column ${referencedColumn} not found in table ${fk.referencedTable}`
      );
    }

    return referencedRecord[referencedColumn];
  }

  /**
   * Get random index with optional seeding
   */
  private getRandomIndex(length: number, seed?: number, rowIndex?: number): number {
    if (seed !== undefined && rowIndex !== undefined) {
      const pseudoRandom = this.seededRandom(seed + rowIndex);
      return Math.floor(pseudoRandom * length);
    }
    return Math.floor(Math.random() * length);
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Generate foreign key with distribution (for realistic data patterns)
   * This will be used in Phase 2 for Zipf distribution
   */
  public generateWithDistribution(
    column: ColumnDefinition,
    fk: ForeignKeyConstraint,
    context: GenerationContext,
    distribution: 'uniform' | 'zipf' = 'uniform'
  ): any {
    if (distribution === 'uniform') {
      return this.generate(column, fk, context);
    }

    const referencedData = context.allData.get(fk.referencedTable);
    if (!referencedData || referencedData.length === 0) {
      throw new Error(`Referenced table ${fk.referencedTable} has no data`);
    }

    const columnIndex = fk.columns.indexOf(column.name);
    const referencedColumn = fk.referencedColumns[columnIndex];

    const index = this.getZipfIndex(referencedData.length, context.seed, context.rowIndex);
    return referencedData[index][referencedColumn];
  }

  /**
   * Get index following Zipf distribution (placeholder for Phase 2)
   */
  private getZipfIndex(length: number, seed?: number, rowIndex?: number): number {
    return Math.floor(Math.random() * length);
  }
}
