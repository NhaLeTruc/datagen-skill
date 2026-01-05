import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { SQLParser } from '../../core/parser/sql-parser';
import { GenerationEngine } from '../../core/generator/engine';
import { ConstraintValidator } from '../../core/validator/constraint-validator';
import { SQLExporter } from '../../core/exporter/sql-exporter';
import { GenerationOptions } from '../../types';

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate test data from SQL schema')
    .argument('<schema>', 'Path to SQL schema file')
    .option('-c, --count <number>', 'Number of records to generate', '100')
    .option('-s, --seed <number>', 'Random seed for reproducible generation')
    .option('-l, --locale <locale>', 'Locale for generated data (us, uk, de, fr, ca, au)', 'us')
    .option('-f, --format <format>', 'Output format (sql, json, csv)', 'sql')
    .option('-o, --output <path>', 'Output file path')
    .option('--validate', 'Validate generated data', true)
    .option('--no-validate', 'Skip validation')
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

async function generateData(schemaPath: string, options: any): Promise<void> {
  const startTime = Date.now();

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

  const genOptions: GenerationOptions = {
    count: parseInt(options.count, 10),
    seed: options.seed ? parseInt(options.seed, 10) : undefined,
    locale: options.locale,
    format: options.format,
    output: options.output,
    validate: options.validate
  };

  console.log(`\n⚙️  Generation settings:`);
  console.log(`   Records per table: ${genOptions.count}`);
  console.log(`   Locale: ${genOptions.locale}`);
  console.log(`   Format: ${genOptions.format}`);
  if (genOptions.seed !== undefined) {
    console.log(`   Seed: ${genOptions.seed}`);
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

  if (genOptions.validate) {
    console.log('\n🔍 Validating data...');
    const validator = new ConstraintValidator();
    const validationResults = validator.validateAll(schema, tableData);

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
  }

  console.log('\n📦 Exporting data...');
  const exporter = new SQLExporter();
  let output: string;

  if (options.transaction) {
    output = exporter.exportWithTransaction(tableData, schema, genOptions);
  } else if (options.withDelete) {
    output = exporter.exportWithDelete(tableData, schema, genOptions);
  } else {
    output = exporter.export(tableData, schema, genOptions);
  }

  let outputPath: string;
  if (genOptions.output) {
    outputPath = genOptions.output;
  } else {
    const schemaName = path.basename(schemaPath, path.extname(schemaPath));
    outputPath = path.join(process.cwd(), `${schemaName}-data.${genOptions.format}`);
  }

  fs.writeFileSync(outputPath, output, 'utf-8');

  const duration = Date.now() - startTime;
  console.log(`\n✨ Done! Output written to: ${outputPath}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
}
