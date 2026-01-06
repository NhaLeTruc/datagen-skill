import { Writable, Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import * as fs from 'fs';
import { SchemaDefinition, TableDefinition, GenerationOptions } from '../types';
import { ValueGenerator } from '../core/generator/value-generator';

export interface StreamingOptions extends GenerationOptions {
  batchSize?: number;
  outputPath?: string;
  onProgress?: (progress: StreamProgress) => void;
}

export interface StreamProgress {
  table: string;
  generated: number;
  total: number;
  percentage: number;
  elapsedMs: number;
}

export class StreamingDataGenerator {
  private schema: SchemaDefinition;
  private options: StreamingOptions;
  private valueGenerator: ValueGenerator;

  constructor(schema: SchemaDefinition, options: StreamingOptions) {
    this.schema = schema;
    this.options = {
      batchSize: 1000,
      ...options
    };
    this.valueGenerator = new ValueGenerator(
      options.seed || Date.now(),
      options.locale
    );
  }

  async generateToStream(table: TableDefinition, outputStream: Writable): Promise<void> {
    const count = this.options.count || 1000;
    const batchSize = this.options.batchSize || 1000;
    const startTime = Date.now();

    let generated = 0;

    while (generated < count) {
      const currentBatchSize = Math.min(batchSize, count - generated);
      const batch = await this.generateBatch(table, currentBatchSize);

      for (const record of batch) {
        const written = outputStream.write(JSON.stringify(record) + '\n');

        if (!written) {
          await new Promise<void>(resolve => outputStream.once('drain', resolve));
        }
      }

      generated += currentBatchSize;

      if (this.options.onProgress) {
        this.options.onProgress({
          table: table.name,
          generated,
          total: count,
          percentage: (generated / count) * 100,
          elapsedMs: Date.now() - startTime
        });
      }
    }

    outputStream.end();
  }

  async generateToFile(table: TableDefinition, filePath: string): Promise<void> {
    const writeStream = fs.createWriteStream(filePath, { encoding: 'utf-8' });

    try {
      await this.generateToStream(table, writeStream);
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }

  async generateAllTablesToFiles(outputDir: string): Promise<void> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const table of this.schema.tables) {
      const filePath = `${outputDir}/${table.name}.jsonl`;
      await this.generateToFile(table, filePath);
    }
  }

  private async generateBatch(table: TableDefinition, batchSize: number): Promise<Record<string, any>[]> {
    const records: Record<string, any>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const record: Record<string, any> = {};

      for (const column of table.columns) {
        record[column.name] = this.valueGenerator.generate(column, {
          rowIndex: i,
          tableName: table.name,
          allData: new Map(),
          existingValues: new Map()
        });
      }

      records.push(record);
    }

    return records;
  }

  async *generateRecords(table: TableDefinition): AsyncGenerator<Record<string, any>> {
    const count = this.options.count || 1000;
    const batchSize = this.options.batchSize || 1000;
    let generated = 0;

    while (generated < count) {
      const currentBatchSize = Math.min(batchSize, count - generated);
      const batch = await this.generateBatch(table, currentBatchSize);

      for (const record of batch) {
        yield record;
      }

      generated += currentBatchSize;
    }
  }

  static createJSONLinesWriter(outputPath: string): Writable {
    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const line = JSON.stringify(chunk) + '\n';
          callback(null, line);
        } catch (error) {
          callback(error as Error);
        }
      }
    }).pipe(writeStream);
  }

  static createCSVWriter(outputPath: string, columns: string[]): Writable {
    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8' });

    let headerWritten = false;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          if (!headerWritten) {
            writeStream.write(columns.join(',') + '\n');
            headerWritten = true;
          }

          const values = columns.map(col => {
            const value = chunk[col];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          });

          callback(null, values.join(',') + '\n');
        } catch (error) {
          callback(error as Error);
        }
      }
    }).pipe(writeStream);
  }

  async generateWithBackpressure(
    table: TableDefinition,
    processor: (record: Record<string, any>) => Promise<void>
  ): Promise<void> {
    const count = this.options.count || 1000;
    const batchSize = this.options.batchSize || 1000;
    const startTime = Date.now();

    let generated = 0;

    while (generated < count) {
      const currentBatchSize = Math.min(batchSize, count - generated);
      const batch = await this.generateBatch(table, currentBatchSize);

      for (const record of batch) {
        await processor(record);
      }

      generated += currentBatchSize;

      if (this.options.onProgress) {
        this.options.onProgress({
          table: table.name,
          generated,
          total: count,
          percentage: (generated / count) * 100,
          elapsedMs: Date.now() - startTime
        });
      }
    }
  }

  async generateToDatabase(
    table: TableDefinition,
    insertFn: (records: Record<string, any>[]) => Promise<void>
  ): Promise<void> {
    const count = this.options.count || 1000;
    const batchSize = this.options.batchSize || 1000;
    const startTime = Date.now();

    let generated = 0;

    while (generated < count) {
      const currentBatchSize = Math.min(batchSize, count - generated);
      const batch = await this.generateBatch(table, currentBatchSize);

      await insertFn(batch);

      generated += currentBatchSize;

      if (this.options.onProgress) {
        this.options.onProgress({
          table: table.name,
          generated,
          total: count,
          percentage: (generated / count) * 100,
          elapsedMs: Date.now() - startTime
        });
      }
    }
  }
}

export class StreamingValidator {
  async validateStream(
    inputPath: string,
    validatorFn: (record: Record<string, any>) => boolean | Promise<boolean>
  ): Promise<{ valid: number; invalid: number; errors: string[] }> {
    const readStream = fs.createReadStream(inputPath, { encoding: 'utf-8' });

    let valid = 0;
    let invalid = 0;
    const errors: string[] = [];

    let buffer = '';

    for await (const chunk of readStream) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const record = JSON.parse(line);
          const isValid = await validatorFn(record);

          if (isValid) {
            valid++;
          } else {
            invalid++;
            errors.push(`Invalid record: ${line}`);
          }
        } catch (error) {
          invalid++;
          errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return { valid, invalid, errors };
  }

  async countRecords(inputPath: string): Promise<number> {
    const readStream = fs.createReadStream(inputPath, { encoding: 'utf-8' });

    let count = 0;
    let buffer = '';

    for await (const chunk of readStream) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      count += lines.filter(l => l.trim()).length;
    }

    return count;
  }
}

export class StreamingAggregator {
  async aggregate<T>(
    inputPath: string,
    aggregatorFn: (accumulator: T, record: Record<string, any>) => T,
    initialValue: T
  ): Promise<T> {
    const readStream = fs.createReadStream(inputPath, { encoding: 'utf-8' });

    let accumulator = initialValue;
    let buffer = '';

    for await (const chunk of readStream) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const record = JSON.parse(line);
          accumulator = aggregatorFn(accumulator, record);
        } catch (error) {
          console.error(`Failed to parse line: ${line}`);
        }
      }
    }

    return accumulator;
  }

  async computeStatistics(inputPath: string, numericFields: string[]): Promise<Record<string, any>> {
    const stats = await this.aggregate(
      inputPath,
      (acc, record) => {
        for (const field of numericFields) {
          if (typeof record[field] === 'number') {
            if (!acc[field]) {
              acc[field] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
            }
            acc[field].sum += record[field];
            acc[field].count += 1;
            acc[field].min = Math.min(acc[field].min, record[field]);
            acc[field].max = Math.max(acc[field].max, record[field]);
          }
        }
        return acc;
      },
      {} as Record<string, any>
    );

    for (const field of Object.keys(stats)) {
      stats[field].mean = stats[field].sum / stats[field].count;
    }

    return stats;
  }
}
