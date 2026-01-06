import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';
import { GenerationOptions, SupportedLocale } from '../types';
import { DatabaseConnectionConfig } from '../core/database/types';

export interface InteractiveConfig {
  mode: 'file' | 'database';
  schemaSource?: string;
  databaseConfig?: DatabaseConnectionConfig;
  outputFormat: 'sql' | 'json' | 'csv' | 'django' | 'rails' | 'prisma';
  outputPath?: string;
  generationOptions: GenerationOptions;
}

export class InteractiveMode {
  async run(): Promise<InteractiveConfig> {
    console.log('\n🎯 Test Data Generator - Interactive Mode\n');

    const mode = await this.askMode();
    const schemaConfig = await this.askSchemaSource(mode);
    const outputFormat = await this.askOutputFormat();
    const generationOptions = await this.askGenerationOptions();
    const outputPath = await this.askOutputPath(outputFormat);

    const config: InteractiveConfig = {
      mode,
      ...schemaConfig,
      outputFormat,
      outputPath,
      generationOptions
    };

    await this.confirmConfiguration(config);

    return config;
  }

  private async askMode(): Promise<'file' | 'database'> {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to provide the schema?',
        choices: [
          { name: 'SQL schema file', value: 'file' },
          { name: 'Database introspection', value: 'database' }
        ]
      }
    ]);

    return mode;
  }

  private async askSchemaSource(mode: 'file' | 'database'): Promise<{
    schemaSource?: string;
    databaseConfig?: DatabaseConnectionConfig;
  }> {
    if (mode === 'file') {
      const { schemaPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'schemaPath',
          message: 'Enter path to SQL schema file:',
          validate: (input: string) => {
            if (!input) return 'Schema path is required';
            if (!fs.existsSync(input)) return 'File does not exist';
            return true;
          }
        }
      ]);

      return { schemaSource: schemaPath };
    } else {
      const databaseConfig = await this.askDatabaseConfig();
      return { databaseConfig };
    }
  }

  private async askDatabaseConfig(): Promise<DatabaseConnectionConfig> {
    const { dbType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'dbType',
        message: 'Select database type:',
        choices: [
          { name: 'PostgreSQL', value: 'postgresql' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'SQLite', value: 'sqlite' }
        ]
      }
    ]);

    if (dbType === 'sqlite') {
      const { filename } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filename',
          message: 'Enter SQLite database file path:',
          validate: (input: string) => input ? true : 'Filename is required'
        }
      ]);

      return {
        type: 'sqlite',
        database: '',
        filename
      };
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Database host:',
          default: 'localhost'
        },
        {
          type: 'input',
          name: 'port',
          message: 'Database port:',
          default: dbType === 'postgresql' ? 5432 : 3306,
          validate: (input: string) => {
            const port = parseInt(input);
            return !isNaN(port) && port > 0 && port < 65536 ? true : 'Invalid port number';
          }
        },
        {
          type: 'input',
          name: 'database',
          message: 'Database name:',
          validate: (input: string) => input ? true : 'Database name is required'
        },
        {
          type: 'input',
          name: 'username',
          message: 'Username:',
          validate: (input: string) => input ? true : 'Username is required'
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          mask: '*'
        },
        {
          type: 'confirm',
          name: 'ssl',
          message: 'Use SSL?',
          default: false
        }
      ]);

      return {
        type: dbType as 'postgresql' | 'mysql',
        host: answers.host,
        port: parseInt(answers.port),
        database: answers.database,
        username: answers.username,
        password: answers.password,
        ssl: answers.ssl
      };
    }
  }

  private async askOutputFormat(): Promise<'sql' | 'json' | 'csv' | 'django' | 'rails' | 'prisma'> {
    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Select output format:',
        choices: [
          { name: 'SQL INSERT statements', value: 'sql' },
          { name: 'JSON', value: 'json' },
          { name: 'CSV', value: 'csv' },
          { name: 'Django fixtures', value: 'django' },
          { name: 'Rails fixtures (YAML)', value: 'rails' },
          { name: 'Prisma seed script', value: 'prisma' }
        ]
      }
    ]);

    return format;
  }

  private async askGenerationOptions(): Promise<GenerationOptions> {
    const basicAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'count',
        message: 'Number of records to generate per table:',
        default: '100',
        validate: (input: string) => {
          const num = parseInt(input);
          return !isNaN(num) && num > 0 ? true : 'Must be a positive number';
        }
      },
      {
        type: 'list',
        name: 'locale',
        message: 'Select data locale:',
        choices: [
          { name: 'English (US)', value: 'en_US' },
          { name: 'English (GB)', value: 'en_GB' },
          { name: 'German', value: 'de_DE' },
          { name: 'French', value: 'fr_FR' },
          { name: 'English (Canada)', value: 'en_CA' },
          { name: 'English (Australia)', value: 'en_AU' }
        ],
        default: 'en_US'
      },
      {
        type: 'input',
        name: 'seed',
        message: 'Random seed (leave empty for random):',
        default: '',
        validate: (input: string) => {
          if (!input) return true;
          const num = parseInt(input);
          return !isNaN(num) ? true : 'Must be a number';
        }
      }
    ]);

    const advancedAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'validate',
        message: 'Validate constraints after generation?',
        default: true
      },
      {
        type: 'confirm',
        name: 'useEdgeCases',
        message: 'Inject edge cases?',
        default: false
      }
    ]);

    let edgeCases: number | undefined;
    if (advancedAnswers.useEdgeCases) {
      const { edgeCasePercentage } = await inquirer.prompt([
        {
          type: 'input',
          name: 'edgeCasePercentage',
          message: 'Edge case percentage (0-100):',
          default: '10',
          validate: (input: string) => {
            const num = parseInt(input);
            return !isNaN(num) && num >= 0 && num <= 100 ? true : 'Must be between 0 and 100';
          }
        }
      ]);
      edgeCases = parseInt(edgeCasePercentage);
    }

    const streamingAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useStreaming',
        message: 'Use streaming for large datasets (>100k records)?',
        default: parseInt(basicAnswers.count) > 100000,
        when: () => parseInt(basicAnswers.count) > 10000
      }
    ]);

    return {
      count: parseInt(basicAnswers.count),
      locale: basicAnswers.locale as SupportedLocale,
      seed: basicAnswers.seed ? parseInt(basicAnswers.seed) : Date.now(),
      format: 'sql',
      validate: advancedAnswers.validate,
      edgeCases,
      streaming: streamingAnswers.useStreaming
    };
  }

  private async askOutputPath(format: string): Promise<string | undefined> {
    const { saveToFile } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveToFile',
        message: 'Save output to file?',
        default: true
      }
    ]);

    if (!saveToFile) {
      return undefined;
    }

    const extension = this.getFileExtension(format);

    const { outputPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputPath',
        message: 'Output file path:',
        default: `./output.${extension}`,
        validate: (input: string) => {
          if (!input) return 'Output path is required';
          const dir = path.dirname(input);
          if (dir && !fs.existsSync(dir)) {
            return `Directory ${dir} does not exist`;
          }
          return true;
        }
      }
    ]);

    return outputPath;
  }

  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      sql: 'sql',
      json: 'json',
      csv: 'csv',
      django: 'json',
      rails: 'yml',
      prisma: 'js'
    };

    return extensions[format] || 'txt';
  }

  private async confirmConfiguration(config: InteractiveConfig): Promise<void> {
    console.log('\n📋 Configuration Summary:\n');
    console.log(`Mode: ${config.mode}`);

    if (config.schemaSource) {
      console.log(`Schema: ${config.schemaSource}`);
    } else if (config.databaseConfig) {
      console.log(`Database: ${config.databaseConfig.type}`);
      if (config.databaseConfig.type === 'sqlite') {
        console.log(`  File: ${config.databaseConfig.filename}`);
      } else {
        console.log(`  Host: ${config.databaseConfig.host}:${config.databaseConfig.port}`);
        console.log(`  Database: ${config.databaseConfig.database}`);
      }
    }

    console.log(`Output Format: ${config.outputFormat}`);
    console.log(`Records per table: ${config.generationOptions.count}`);
    console.log(`Locale: ${config.generationOptions.locale}`);
    console.log(`Seed: ${config.generationOptions.seed}`);
    console.log(`Validation: ${config.generationOptions.validate ? 'Yes' : 'No'}`);

    if (config.generationOptions.edgeCases) {
      console.log(`Edge Cases: ${config.generationOptions.edgeCases}%`);
    }

    if (config.outputPath) {
      console.log(`Output: ${config.outputPath}`);
    } else {
      console.log(`Output: Console`);
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '\nProceed with this configuration?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log('\n❌ Cancelled by user\n');
      process.exit(0);
    }
  }

  async askForTableFilter(): Promise<{ includeTables?: string[]; excludeTables?: string[] }> {
    const { filterType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'filterType',
        message: 'Filter tables?',
        choices: [
          { name: 'Generate all tables', value: 'all' },
          { name: 'Include specific tables', value: 'include' },
          { name: 'Exclude specific tables', value: 'exclude' }
        ]
      }
    ]);

    if (filterType === 'all') {
      return {};
    }

    const { tables } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tables',
        message: `Enter table names (comma-separated):`,
        validate: (input: string) => input ? true : 'At least one table name is required'
      }
    ]);

    const tableList = tables.split(',').map((t: string) => t.trim());

    if (filterType === 'include') {
      return { includeTables: tableList };
    } else {
      return { excludeTables: tableList };
    }
  }
}
