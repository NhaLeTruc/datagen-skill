import { ColumnDefinition, GenerationContext } from '../../types';

export class UniqueGenerator {
  private usedValues: Map<string, Set<any>> = new Map();
  private maxAttempts = 1000;

  /**
   * Generate unique value for a column
   */
  public generate(
    column: ColumnDefinition,
    tableName: string,
    context: GenerationContext,
    valueGenerator: () => any
  ): any {
    const key = `${tableName}.${column.name}`;

    if (!this.usedValues.has(key)) {
      this.usedValues.set(key, new Set());
    }

    const usedSet = this.usedValues.get(key)!;
    let attempts = 0;
    let value: any;

    do {
      value = valueGenerator();
      attempts++;

      if (attempts > this.maxAttempts) {
        throw new Error(
          `Failed to generate unique value for ${tableName}.${column.name} ` +
          `after ${this.maxAttempts} attempts. ` +
          `Consider using a different generation strategy or increasing the value space.`
        );
      }
    } while (usedSet.has(this.serializeValue(value)));

    usedSet.add(this.serializeValue(value));
    return value;
  }

  /**
   * Generate unique composite value (for multi-column unique constraints)
   */
  public generateComposite(
    columns: string[],
    tableName: string,
    context: GenerationContext,
    valueGenerators: Map<string, () => any>
  ): Map<string, any> {
    const key = `${tableName}.${columns.join('_')}`;

    if (!this.usedValues.has(key)) {
      this.usedValues.set(key, new Set());
    }

    const usedSet = this.usedValues.get(key)!;
    let attempts = 0;
    let values: Map<string, any>;

    do {
      values = new Map();
      for (const column of columns) {
        const generator = valueGenerators.get(column);
        if (!generator) {
          throw new Error(`No value generator provided for column ${column}`);
        }
        values.set(column, generator());
      }

      attempts++;

      if (attempts > this.maxAttempts) {
        throw new Error(
          `Failed to generate unique composite value for ${tableName}.(${columns.join(', ')}) ` +
          `after ${this.maxAttempts} attempts.`
        );
      }
    } while (usedSet.has(this.serializeCompositeValue(values)));

    usedSet.add(this.serializeCompositeValue(values));
    return values;
  }

  /**
   * Check if value is already used
   */
  public isUsed(tableName: string, columnName: string, value: any): boolean {
    const key = `${tableName}.${columnName}`;
    const usedSet = this.usedValues.get(key);
    if (!usedSet) return false;
    return usedSet.has(this.serializeValue(value));
  }

  /**
   * Check if composite value is already used
   */
  public isCompositeUsed(
    tableName: string,
    columns: string[],
    values: Map<string, any>
  ): boolean {
    const key = `${tableName}.${columns.join('_')}`;
    const usedSet = this.usedValues.get(key);
    if (!usedSet) return false;
    return usedSet.has(this.serializeCompositeValue(values));
  }

  /**
   * Mark value as used
   */
  public markUsed(tableName: string, columnName: string, value: any): void {
    const key = `${tableName}.${columnName}`;
    if (!this.usedValues.has(key)) {
      this.usedValues.set(key, new Set());
    }
    this.usedValues.get(key)!.add(this.serializeValue(value));
  }

  /**
   * Mark composite value as used
   */
  public markCompositeUsed(
    tableName: string,
    columns: string[],
    values: Map<string, any>
  ): void {
    const key = `${tableName}.${columns.join('_')}`;
    if (!this.usedValues.has(key)) {
      this.usedValues.set(key, new Set());
    }
    this.usedValues.get(key)!.add(this.serializeCompositeValue(values));
  }

  /**
   * Serialize value for storage in Set
   */
  private serializeValue(value: any): string {
    if (value === null) return '__NULL__';
    if (value === undefined) return '__UNDEFINED__';
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Serialize composite value for storage in Set
   */
  private serializeCompositeValue(values: Map<string, any>): string {
    const sorted = Array.from(values.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return JSON.stringify(sorted);
  }

  /**
   * Get count of unique values for a column
   */
  public getUniqueCount(tableName: string, columnName: string): number {
    const key = `${tableName}.${columnName}`;
    const usedSet = this.usedValues.get(key);
    return usedSet ? usedSet.size : 0;
  }

  /**
   * Clear all tracked values (useful for testing)
   */
  public reset(): void {
    this.usedValues.clear();
  }

  /**
   * Clear tracked values for specific table
   */
  public resetTable(tableName: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.usedValues.keys()) {
      if (key.startsWith(`${tableName}.`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.usedValues.delete(key);
    }
  }

  /**
   * Set max attempts for unique value generation
   */
  public setMaxAttempts(attempts: number): void {
    this.maxAttempts = attempts;
  }
}
