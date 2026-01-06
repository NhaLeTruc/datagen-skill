import { TableData, SchemaDefinition, GenerationOptions } from '../../../types';

export interface DjangoFixture {
  model: string;
  pk: number | string;
  fields: Record<string, any>;
}

export class DjangoExporter {
  private appLabel: string;

  constructor(appLabel: string = 'app') {
    this.appLabel = appLabel;
  }

  export(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const fixtures = this.convertToFixtures(tableData, schema);
    return JSON.stringify(fixtures, null, 2);
  }

  exportSeparateFiles(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): { model: string; content: string }[] {
    const result: { model: string; content: string }[] = [];

    for (const data of tableData) {
      const table = schema.tables.find(t => t.name === data.table);
      if (!table) continue;

      const fixtures = this.convertTableToFixtures(data, table.name);
      result.push({
        model: data.table,
        content: JSON.stringify(fixtures, null, 2)
      });
    }

    return result;
  }

  private convertToFixtures(tableData: TableData[], schema: SchemaDefinition): DjangoFixture[] {
    const fixtures: DjangoFixture[] = [];

    for (const data of tableData) {
      const table = schema.tables.find(t => t.name === data.table);
      if (!table) continue;

      const tableFixtures = this.convertTableToFixtures(data, table.name);
      fixtures.push(...tableFixtures);
    }

    return fixtures;
  }

  private convertTableToFixtures(data: TableData, tableName: string): DjangoFixture[] {
    const fixtures: DjangoFixture[] = [];

    for (const record of data.records) {
      const pk = this.extractPrimaryKey(record);
      const fields = this.extractFields(record, pk);

      fixtures.push({
        model: `${this.appLabel}.${this.toDjangoModelName(tableName)}`,
        pk,
        fields
      });
    }

    return fixtures;
  }

  private extractPrimaryKey(record: Record<string, any>): number | string {
    if ('id' in record) {
      return record.id;
    }

    const keys = Object.keys(record);
    if (keys.length > 0) {
      return record[keys[0]];
    }

    return 1;
  }

  private extractFields(record: Record<string, any>, pk: number | string): Record<string, any> {
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key === 'id' || record[key] === pk) {
        continue;
      }

      fields[key] = this.formatValue(value);
    }

    return fields;
  }

  private formatValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v));
    }

    if (typeof value === 'object') {
      return value;
    }

    return String(value);
  }

  private toDjangoModelName(tableName: string): string {
    return tableName
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  exportWithMetadata(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const fixtures = this.convertToFixtures(tableData, schema);

    const metadata = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      generated_by: 'testdatagen',
      app_label: this.appLabel,
      total_fixtures: fixtures.length,
      models: tableData.map(t => t.table),
      options: {
        locale: options.locale,
        seed: options.seed,
        count: options.count
      }
    };

    return JSON.stringify({
      metadata,
      fixtures
    }, null, 2);
  }

  setAppLabel(appLabel: string): void {
    this.appLabel = appLabel;
  }

  getAppLabel(): string {
    return this.appLabel;
  }

  validateFixtures(fixtures: DjangoFixture[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const seenPks = new Map<string, Set<number | string>>();

    for (let i = 0; i < fixtures.length; i++) {
      const fixture = fixtures[i];

      if (!fixture.model || typeof fixture.model !== 'string') {
        errors.push(`Fixture at index ${i} has invalid or missing model`);
      }

      if (fixture.pk === null || fixture.pk === undefined) {
        errors.push(`Fixture at index ${i} (${fixture.model}) has missing pk`);
      }

      if (!fixture.fields || typeof fixture.fields !== 'object') {
        errors.push(`Fixture at index ${i} (${fixture.model}) has invalid or missing fields`);
      }

      if (fixture.model) {
        if (!seenPks.has(fixture.model)) {
          seenPks.set(fixture.model, new Set());
        }

        if (seenPks.get(fixture.model)!.has(fixture.pk)) {
          errors.push(`Duplicate pk ${fixture.pk} for model ${fixture.model}`);
        }

        seenPks.get(fixture.model)!.add(fixture.pk);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  parseFixtures(json: string): DjangoFixture[] {
    try {
      const parsed = JSON.parse(json);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed.fixtures && Array.isArray(parsed.fixtures)) {
        return parsed.fixtures;
      }

      throw new Error('Invalid Django fixture format');
    } catch (error) {
      throw new Error(`Failed to parse Django fixtures: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
