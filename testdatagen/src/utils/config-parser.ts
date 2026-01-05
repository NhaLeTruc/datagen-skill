import * as fs from 'fs';
import * as path from 'path';
import { GenerationOptions } from '../types';

export interface DistributionConfig {
  column: string;
  type: 'zipf' | 'normal';
  params?: {
    a?: number;
    mean?: number;
    std?: number;
  };
}

export interface TableConfig {
  name: string;
  count?: number;
  distributions?: DistributionConfig[];
  edgeCases?: number;
}

export interface ConfigFile {
  version?: string;
  global?: {
    seed?: number;
    locale?: string;
    format?: 'sql' | 'json' | 'csv' | 'all';
    output?: string;
    validate?: boolean;
    edgeCases?: number;
  };
  tables?: TableConfig[];
  distributions?: DistributionConfig[];
}

export class ConfigParser {
  /**
   * Parse configuration file (JSON or YAML)
   */
  public static parseFile(filePath: string): ConfigFile {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Configuration file not found: ${absolutePath}`);
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const content = fs.readFileSync(absolutePath, 'utf-8');

    if (ext === '.json') {
      return this.parseJSON(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      return this.parseYAML(content);
    } else {
      throw new Error(`Unsupported configuration file format: ${ext}. Supported formats: .json, .yaml, .yml`);
    }
  }

  /**
   * Parse JSON configuration
   */
  private static parseJSON(content: string): ConfigFile {
    try {
      const config = JSON.parse(content);
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse YAML configuration (basic implementation)
   */
  private static parseYAML(content: string): ConfigFile {
    const config: any = {
      version: '1.0',
      global: {},
      tables: [],
      distributions: []
    };

    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentTable: any = null;
    let currentDistribution: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      if (line === 'global:') {
        currentSection = 'global';
        continue;
      } else if (line === 'tables:') {
        currentSection = 'tables';
        continue;
      } else if (line === 'distributions:') {
        currentSection = 'distributions';
        continue;
      }

      if (currentSection === 'global') {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          config.global[key] = this.parseYAMLValue(value);
        }
      } else if (currentSection === 'tables') {
        if (line.startsWith('- name:')) {
          if (currentTable) {
            config.tables.push(currentTable);
          }
          currentTable = {
            name: this.parseYAMLValue(line.substring(7).trim())
          };
        } else if (currentTable) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            currentTable[key] = this.parseYAMLValue(value);
          }
        }
      } else if (currentSection === 'distributions') {
        if (line.startsWith('- column:')) {
          if (currentDistribution) {
            config.distributions.push(currentDistribution);
          }
          currentDistribution = {
            column: this.parseYAMLValue(line.substring(9).trim())
          };
        } else if (currentDistribution) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            currentDistribution[key] = this.parseYAMLValue(value);
          }
        }
      } else if (line.startsWith('version:')) {
        config.version = this.parseYAMLValue(line.substring(8).trim());
      }
    }

    if (currentTable) {
      config.tables.push(currentTable);
    }
    if (currentDistribution) {
      config.distributions.push(currentDistribution);
    }

    this.validateConfig(config);
    return config;
  }

  /**
   * Parse YAML value to appropriate type
   */
  private static parseYAMLValue(value: string): any {
    const trimmed = value.trim();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    if (/^-?\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }

    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }

  /**
   * Validate configuration structure
   */
  private static validateConfig(config: any): void {
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration must be an object');
    }

    if (config.version !== undefined && typeof config.version !== 'string') {
      throw new Error('config.version must be a string');
    }

    if (config.global !== undefined) {
      if (typeof config.global !== 'object') {
        throw new Error('config.global must be an object');
      }

      const validGlobalKeys = ['seed', 'locale', 'format', 'output', 'validate', 'edgeCases'];
      for (const key of Object.keys(config.global)) {
        if (!validGlobalKeys.includes(key)) {
          throw new Error(`Invalid global configuration key: ${key}`);
        }
      }

      if (config.global.seed !== undefined && typeof config.global.seed !== 'number') {
        throw new Error('config.global.seed must be a number');
      }

      if (config.global.locale !== undefined && typeof config.global.locale !== 'string') {
        throw new Error('config.global.locale must be a string');
      }

      if (config.global.format !== undefined) {
        const validFormats = ['sql', 'json', 'csv', 'all'];
        if (!validFormats.includes(config.global.format)) {
          throw new Error(`config.global.format must be one of: ${validFormats.join(', ')}`);
        }
      }

      if (config.global.edgeCases !== undefined && typeof config.global.edgeCases !== 'number') {
        throw new Error('config.global.edgeCases must be a number');
      }
    }

    if (config.tables !== undefined) {
      if (!Array.isArray(config.tables)) {
        throw new Error('config.tables must be an array');
      }

      for (const table of config.tables) {
        if (typeof table !== 'object') {
          throw new Error('Each table configuration must be an object');
        }

        if (typeof table.name !== 'string') {
          throw new Error('table.name is required and must be a string');
        }

        if (table.count !== undefined && typeof table.count !== 'number') {
          throw new Error('table.count must be a number');
        }

        if (table.edgeCases !== undefined && typeof table.edgeCases !== 'number') {
          throw new Error('table.edgeCases must be a number');
        }
      }
    }

    if (config.distributions !== undefined) {
      if (!Array.isArray(config.distributions)) {
        throw new Error('config.distributions must be an array');
      }

      for (const dist of config.distributions) {
        if (typeof dist !== 'object') {
          throw new Error('Each distribution configuration must be an object');
        }

        if (typeof dist.column !== 'string') {
          throw new Error('distribution.column is required and must be a string');
        }

        const validTypes = ['zipf', 'normal'];
        if (typeof dist.type !== 'string' || !validTypes.includes(dist.type)) {
          throw new Error(`distribution.type must be one of: ${validTypes.join(', ')}`);
        }

        if (dist.params !== undefined && typeof dist.params !== 'object') {
          throw new Error('distribution.params must be an object');
        }
      }
    }
  }

  /**
   * Merge configuration with command-line options
   */
  public static mergeWithOptions(
    config: ConfigFile,
    options: Partial<GenerationOptions>
  ): GenerationOptions {
    const merged: GenerationOptions = {
      count: options.count || 100,
      seed: options.seed ?? config.global?.seed,
      locale: options.locale ?? config.global?.locale,
      format: options.format ?? config.global?.format ?? 'sql',
      output: options.output ?? config.global?.output,
      edgeCases: options.edgeCases ?? config.global?.edgeCases,
      validate: options.validate ?? config.global?.validate
    };

    return merged;
  }

  /**
   * Get table-specific configuration
   */
  public static getTableConfig(config: ConfigFile, tableName: string): TableConfig | undefined {
    return config.tables?.find(t => t.name === tableName);
  }

  /**
   * Get distributions for a specific table/column
   */
  public static getDistributions(
    config: ConfigFile,
    tableName?: string,
    columnName?: string
  ): DistributionConfig[] {
    const distributions: DistributionConfig[] = [];

    if (config.distributions) {
      for (const dist of config.distributions) {
        if (columnName && dist.column === columnName) {
          distributions.push(dist);
        } else if (!columnName) {
          distributions.push(dist);
        }
      }
    }

    if (tableName && config.tables) {
      const tableConfig = config.tables.find(t => t.name === tableName);
      if (tableConfig?.distributions) {
        distributions.push(...tableConfig.distributions);
      }
    }

    return distributions;
  }

  /**
   * Create example configuration file content
   */
  public static createExample(format: 'json' | 'yaml' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        version: '1.0',
        global: {
          seed: 12345,
          locale: 'en_US',
          format: 'sql',
          output: './output',
          validate: true,
          edgeCases: 5
        },
        tables: [
          {
            name: 'users',
            count: 1000,
            edgeCases: 10
          },
          {
            name: 'orders',
            count: 5000,
            distributions: [
              {
                column: 'user_id',
                type: 'zipf',
                params: { a: 1.5 }
              }
            ]
          }
        ],
        distributions: [
          {
            column: 'price',
            type: 'normal',
            params: { mean: 50, std: 15 }
          }
        ]
      }, null, 2);
    } else {
      return `version: 1.0

global:
  seed: 12345
  locale: en_US
  format: sql
  output: ./output
  validate: true
  edgeCases: 5

tables:
  - name: users
    count: 1000
    edgeCases: 10
  - name: orders
    count: 5000

distributions:
  - column: user_id
    type: zipf
    params:
      a: 1.5
  - column: price
    type: normal
    params:
      mean: 50
      std: 15
`;
    }
  }
}
