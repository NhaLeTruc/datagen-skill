import yaml from 'js-yaml';
import { TableData, SchemaDefinition, GenerationOptions } from '../../../types';

export interface RailsFixture {
  [key: string]: Record<string, any>;
}

export class RailsExporter {
  export(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const allFixtures: Record<string, RailsFixture> = {};

    for (const data of tableData) {
      const fixtures = this.convertTableToFixtures(data);
      allFixtures[data.table] = fixtures;
    }

    const sections: string[] = [];
    for (const [tableName, fixtures] of Object.entries(allFixtures)) {
      sections.push(`# ${tableName}`);
      sections.push(yaml.dump(fixtures));
    }

    return sections.join('\n');
  }

  exportSeparateFiles(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): { model: string; content: string }[] {
    const result: { model: string; content: string }[] = [];

    for (const data of tableData) {
      const fixtures = this.convertTableToFixtures(data);
      const content = yaml.dump(fixtures);

      result.push({
        model: data.table,
        content
      });
    }

    return result;
  }

  private convertTableToFixtures(data: TableData): RailsFixture {
    const fixtures: RailsFixture = {};

    for (let i = 0; i < data.records.length; i++) {
      const record = data.records[i];
      const fixtureName = this.generateFixtureName(data.table, i, record);
      const fixtureData = this.formatRecord(record);

      fixtures[fixtureName] = fixtureData;
    }

    return fixtures;
  }

  private generateFixtureName(tableName: string, index: number, record: Record<string, any>): string {
    const singularName = this.singularize(tableName);

    if (record.name && typeof record.name === 'string') {
      return `${singularName}_${this.slugify(record.name)}`;
    }

    if (record.email && typeof record.email === 'string') {
      return `${singularName}_${this.slugify(record.email.split('@')[0])}`;
    }

    if (record.title && typeof record.title === 'string') {
      return `${singularName}_${this.slugify(record.title)}`;
    }

    return `${singularName}_${index + 1}`;
  }

  private formatRecord(record: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      formatted[key] = this.formatValue(value);
    }

    return formatted;
  }

  private formatValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
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

  private singularize(word: string): string {
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }

    if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) {
      return word.slice(0, -2);
    }

    if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }

    return word;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  exportWithMetadata(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const metadata = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      generated_by: 'testdatagen',
      total_records: tableData.reduce((sum, t) => sum + t.records.length, 0),
      tables: tableData.map(t => t.table),
      options: {
        locale: options.locale,
        seed: options.seed,
        count: options.count
      }
    };

    const allFixtures: Record<string, any> = {
      _metadata: metadata
    };

    for (const data of tableData) {
      const fixtures = this.convertTableToFixtures(data);
      allFixtures[data.table] = fixtures;
    }

    return yaml.dump(allFixtures);
  }

  exportAsERB(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const sections: string[] = [];

    for (const data of tableData) {
      sections.push(`# ${data.table}`);

      for (let i = 0; i < data.records.length; i++) {
        const record = data.records[i];
        const fixtureName = this.generateFixtureName(data.table, i, record);

        sections.push(`${fixtureName}:`);

        for (const [key, value] of Object.entries(record)) {
          const formattedValue = this.formatValueAsERB(value);
          sections.push(`  ${key}: ${formattedValue}`);
        }

        sections.push('');
      }
    }

    return sections.join('\n');
  }

  private formatValueAsERB(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (value instanceof Date) {
      return `<%= Time.parse('${value.toISOString()}') %>`;
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    }

    return String(value);
  }

  parseFixtures(yamlContent: string): Record<string, RailsFixture> {
    try {
      const parsed = yaml.load(yamlContent) as any;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid YAML format');
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse Rails fixtures: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateFixtures(fixtures: Record<string, RailsFixture>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [tableName, tableFixtures] of Object.entries(fixtures)) {
      if (tableName.startsWith('_')) {
        continue;
      }

      if (typeof tableFixtures !== 'object' || tableFixtures === null) {
        errors.push(`Table ${tableName} has invalid fixtures`);
        continue;
      }

      for (const [fixtureName, fixtureData] of Object.entries(tableFixtures)) {
        if (typeof fixtureData !== 'object' || fixtureData === null) {
          errors.push(`Fixture ${fixtureName} in table ${tableName} has invalid data`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  exportWithAssociations(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const fixtures: Record<string, RailsFixture> = {};

    for (const data of tableData) {
      const table = schema.tables.find(t => t.name === data.table);
      if (!table) continue;

      const tableFixtures = this.convertTableToFixturesWithAssociations(data, table, tableData);
      fixtures[data.table] = tableFixtures;
    }

    return yaml.dump(fixtures);
  }

  private convertTableToFixturesWithAssociations(
    data: TableData,
    table: any,
    allTableData: TableData[]
  ): RailsFixture {
    const fixtures: RailsFixture = {};

    for (let i = 0; i < data.records.length; i++) {
      const record = data.records[i];
      const fixtureName = this.generateFixtureName(data.table, i, record);
      const fixtureData = this.formatRecordWithAssociations(record, table, allTableData);

      fixtures[fixtureName] = fixtureData;
    }

    return fixtures;
  }

  private formatRecordWithAssociations(
    record: Record<string, any>,
    table: any,
    allTableData: TableData[]
  ): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key.endsWith('_id') && typeof value === 'number') {
        const associationName = key.slice(0, -3);
        formatted[associationName] = `<%= ${associationName}_${value} %>`;
      } else {
        formatted[key] = this.formatValue(value);
      }
    }

    return formatted;
  }
}
