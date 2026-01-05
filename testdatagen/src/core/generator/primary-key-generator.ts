import { ColumnDefinition, GenerationContext } from '../../types';

export class PrimaryKeyGenerator {
  private counters: Map<string, number> = new Map();

  /**
   * Generate primary key value
   */
  public generate(
    column: ColumnDefinition,
    tableName: string,
    context: GenerationContext
  ): any {
    if (column.autoIncrement) {
      return this.generateAutoIncrement(tableName, context);
    }

    const key = `${tableName}.${column.name}`;

    switch (column.type) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT':
        return this.generateSequentialInt(key);

      case 'UUID':
        return this.generateUUID();

      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
        return this.generateSequentialString(key, column.length || 36);

      default:
        return this.generateSequentialInt(key);
    }
  }

  /**
   * Generate auto-increment value
   */
  private generateAutoIncrement(tableName: string, context: GenerationContext): number {
    const key = `${tableName}.__auto_increment__`;
    if (!this.counters.has(key)) {
      this.counters.set(key, 1);
    }
    const value = this.counters.get(key)!;
    this.counters.set(key, value + 1);
    return value;
  }

  /**
   * Generate sequential integer
   */
  private generateSequentialInt(key: string): number {
    if (!this.counters.has(key)) {
      this.counters.set(key, 1);
    }
    const value = this.counters.get(key)!;
    this.counters.set(key, value + 1);
    return value;
  }

  /**
   * Generate sequential string
   */
  private generateSequentialString(key: string, maxLength: number): string {
    if (!this.counters.has(key)) {
      this.counters.set(key, 1);
    }
    const value = this.counters.get(key)!;
    this.counters.set(key, value + 1);

    const prefix = 'pk';
    const numStr = value.toString();
    const totalLength = Math.min(prefix.length + numStr.length, maxLength);

    if (totalLength <= maxLength) {
      return `${prefix}${numStr}`;
    } else {
      return numStr.substring(0, maxLength);
    }
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Reset counters (useful for testing)
   */
  public reset(): void {
    this.counters.clear();
  }

  /**
   * Get current counter value
   */
  public getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }
}
