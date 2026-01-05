import {
  TableData,
  SchemaDefinition,
  GenerationOptions,
  Exporter
} from '../../types';

export class JSONExporter implements Exporter {
  /**
   * Export table data as JSON
   */
  public export(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const output: any = {
      metadata: {
        generator: '@claude-code/testdatagen',
        timestamp: new Date().toISOString(),
        recordCount: this.getTotalRecords(tableData),
        tableCount: tableData.length,
        options: {
          count: options.count,
          seed: options.seed,
          locale: options.locale,
          format: options.format
        }
      },
      tables: {}
    };

    for (const data of tableData) {
      output.tables[data.table] = data.records;
    }

    return JSON.stringify(output, null, 2);
  }

  /**
   * Export as separate files (returns map of filename -> content)
   */
  public exportSeparateFiles(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): Map<string, string> {
    const files = new Map<string, string>();

    for (const data of tableData) {
      const output = {
        table: data.table,
        recordCount: data.records.length,
        timestamp: new Date().toISOString(),
        records: data.records
      };

      const filename = `${data.table}.json`;
      files.set(filename, JSON.stringify(output, null, 2));
    }

    return files;
  }

  /**
   * Export as JSON Lines format (one JSON object per line)
   */
  public exportJSONLines(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const lines: string[] = [];

    for (const data of tableData) {
      for (const record of data.records) {
        const line = {
          _table: data.table,
          ...record
        };
        lines.push(JSON.stringify(line));
      }
    }

    return lines.join('\n');
  }

  /**
   * Export as compact JSON (no whitespace)
   */
  public exportCompact(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const output: any = {
      metadata: {
        generator: '@claude-code/testdatagen',
        timestamp: new Date().toISOString()
      },
      tables: {}
    };

    for (const data of tableData) {
      output.tables[data.table] = data.records;
    }

    return JSON.stringify(output);
  }

  /**
   * Get total record count
   */
  private getTotalRecords(tableData: TableData[]): number {
    return tableData.reduce((sum, data) => sum + data.records.length, 0);
  }
}
