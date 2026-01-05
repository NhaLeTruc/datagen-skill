import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { SQLParser } from '../../core/parser/sql-parser';
import { GenerationEngine } from '../../core/generator/engine';
import { ConstraintValidator } from '../../core/validator/constraint-validator';
import { SQLExporter } from '../../core/exporter/sql-exporter';
import { JSONExporter } from '../../core/exporter/json-exporter';
import { CSVExporter } from '../../core/exporter/csv-exporter';
import { ReportGenerator } from '../../core/validator/report-generator';
import { ConfigParser } from '../../utils/config-parser';
import { GenerationOptions, DistributionConfig } from '../../types';

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate test data from SQL schema')
    .argument('<schema>', 'Path to SQL schema file')
    .option('-c, --count <number>', 'Number of records to generate', '100')
    .option('-s, --seed <number>', 'Random seed for reproducible generation')
    .option('-l, --locale <locale>', 'Locale for generated data (en_US, en_GB, de_DE, fr_FR, en_CA, en_AU)', 'en_US')
    .option('-f, --format <format>', 'Output format (sql, json, csv, all)', 'sql')
    .option('-o, --output <path>', 'Output file path or directory')
    .option('--config <path>', 'Path to configuration file (JSON or YAML)')
    .option('--distribution <column:type[:params]>', 'Apply distribution to column (e.g., "user_id:zipf:1.5" or "price:normal:50,15")', [])
    .option('--edge-cases <percentage>', 'Percentage of records with edge cases (0-100)')
    .option('--validate', 'Validate generated data', true)
    .option('--no-validate', 'Skip validation')
    .option('--validation-report <path>', 'Save validation report to file')
    .option('--transaction', 'Wrap SQL output in transaction')
    .option('--with-delete', 'Include DELETE statements before INSERT')
    .action(async (schemaPath: string, options: any) => {
      try {
        await generateData(schemaPath, options);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return command;
}

function parseDistributionOption(distStr: string): DistributionConfig {
  const parts = distStr.split(':');
  if (parts.length < 2) {
    throw new Error(`Invalid distribution format: ${distStr}. Expected format: "column:type[:params]"`);
  }

  const column = parts[0];
  const type = parts[1] as 'zipf' | 'normal';

  if (type !== 'zipf' && type !== 'normal') {
    throw new Error(`Invalid distribution type: ${type}. Must be 'zipf' or 'normal'`);
  }

  const config: DistributionConfig = { column, type };

  if (parts.length >= 3) {
    const params = parts[2].split(',').map(p => parseFloat(p.trim()));

    if (type === 'zipf') {
      config.params = { a: params[0] || 1.5 };
    } else if (type === 'normal') {
      config.params = { mean: params[0] || 0, std: params[1] || 1 };
    }
  }

  return config;
}

async function generateData(schemaPath: string, options: any): Promise<void> {
  const startTime = Date.now();

  let configFile: any = null;
  if (options.config) {
    console.log(`📋 Reading configuration file: ${options.config}`);
    configFile = ConfigParser.parseFile(options.config);
  }

  console.log('📋 Reading schema file...');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  console.log('🔍 Parsing schema...');
  const parser = new SQLParser();
  const schema = parser.parseSchema(schemaSQL);

  if (schema.tables.length === 0) {
    throw new Error('No tables found in schema');
  }

  console.log(`Found ${schema.tables.length} table(s): ${schema.tables.map(t => t.name).join(', ')}`);

  const distributions: DistributionConfig[] = [];
  if (Array.isArray(options.distribution) && options.distribution.length > 0) {
    for (const distStr of options.distribution) {
      distributions.push(parseDistributionOption(distStr));
    }
  }
  if (configFile?.distributions) {
    distributions.push(...configFile.distributions);
  }

  let genOptions: GenerationOptions = {
    count: parseInt(options.count, 10),
    seed: options.seed ? parseInt(options.seed, 10) : undefined,
    locale: options.locale,
    format: options.format,
    output: options.output,
    validate: options.validate,
    edgeCases: options.edgeCases ? parseFloat(options.edgeCases) : undefined,
    distributions: distributions.length > 0 ? distributions : undefined
  };

  if (configFile) {
    genOptions = ConfigParser.mergeWithOptions(configFile, genOptions);
  }

  console.log(`\n⚙️  Generation settings:`);
  console.log(`   Records per table: ${genOptions.count}`);
  console.log(`   Locale: ${genOptions.locale}`);
  console.log(`   Format: ${genOptions.format}`);
  if (genOptions.seed !== undefined) {
    console.log(`   Seed: ${genOptions.seed}`);
  }
  if (genOptions.edgeCases !== undefined) {
    console.log(`   Edge cases: ${genOptions.edgeCases}%`);
  }
  if (genOptions.distributions && genOptions.distributions.length > 0) {
    console.log(`   Distributions: ${genOptions.distributions.length} configured`);
  }

  console.log('\n🔨 Generating data...');
  const engine = new GenerationEngine();
  const tableData = await engine.generate(schema, genOptions);

  console.log('✅ Data generated successfully');

  const stats = engine.getStatistics(tableData);
  console.log(`\n📊 Statistics:`);
  console.log(`   Total records: ${stats.totalRecords}`);
  for (const tableStat of stats.tablesGenerated) {
    console.log(`   - ${tableStat.table}: ${tableStat.recordCount} records`);
  }

  let validationResults: any[] = [];
  if (genOptions.validate) {
    console.log('\n🔍 Validating data...');
    const validator = new ConstraintValidator();
    validationResults = validator.validateAll(schema, tableData);

    const summary = validator.getValidationSummary(validationResults);
    console.log(`   Valid tables: ${summary.validTables}/${summary.totalTables}`);

    if (summary.totalErrors > 0) {
      console.log(`   ⚠️  Total errors: ${summary.totalErrors}`);
      console.log(`   Errors by type:`);
      for (const [type, count] of Object.entries(summary.errorsByType)) {
        console.log(`      - ${type}: ${count}`);
      }

      for (const result of validationResults) {
        if (!result.valid) {
          console.log(`\n   ❌ ${result.table}:`);
          for (const error of result.errors.slice(0, 5)) {
            console.log(`      - ${error.message}`);
          }
          if (result.errors.length > 5) {
            console.log(`      ... and ${result.errors.length - 5} more errors`);
          }
        }
      }

      throw new Error('Validation failed. Please review the errors above.');
    }

    console.log('   ✅ All validations passed');

    if (options.validationReport) {
      console.log(`\n📝 Generating validation report...`);
      const reportContent = ReportGenerator.prepareForFile(
        validationResults,
        schema,
        genOptions,
        'json'
      );
      fs.writeFileSync(options.validationReport, reportContent, 'utf-8');
      console.log(`   Report saved to: ${options.validationReport}`);
    }
  }

  console.log('\n📦 Exporting data...');

  const schemaName = path.basename(schemaPath, path.extname(schemaPath));
  const formats = genOptions.format === 'all' ? ['sql', 'json', 'csv'] : [genOptions.format];

  for (const format of formats) {
    let output: string;
    let outputPath: string;

    if (format === 'sql') {
      const exporter = new SQLExporter();
      if (options.transaction) {
        output = exporter.exportWithTransaction(tableData, schema, genOptions);
      } else if (options.withDelete) {
        output = exporter.exportWithDelete(tableData, schema, genOptions);
      } else {
        output = exporter.export(tableData, schema, genOptions);
      }
    } else if (format === 'json') {
      const exporter = new JSONExporter();
      output = exporter.export(tableData, schema, genOptions);
    } else if (format === 'csv') {
      const exporter = new CSVExporter();
      output = exporter.export(tableData, schema, genOptions);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (genOptions.output) {
      if (formats.length > 1) {
        const dir = genOptions.output;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        outputPath = path.join(dir, `${schemaName}-data.${format}`);
      } else {
        outputPath = genOptions.output;
      }
    } else {
      outputPath = path.join(process.cwd(), `${schemaName}-data.${format}`);
    }

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`   ${format.toUpperCase()}: ${outputPath}`);
  }

  const duration = Date.now() - startTime;
  console.log(`\n✨ Done!`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
}
