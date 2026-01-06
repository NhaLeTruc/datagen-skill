import { Command } from 'commander';
import { InteractiveMode } from '../interactive';
import { SQLParser } from '../../core/parser/sql-parser';
import { GenerationEngine } from '../../core/generator/engine';
import { SQLExporter } from '../../core/exporter/sql-exporter';
import { JSONExporter } from '../../core/exporter/json-exporter';
import { CSVExporter } from '../../core/exporter/csv-exporter';
import { DjangoExporter } from '../../core/exporter/orm-exporters/django';
import { RailsExporter } from '../../core/exporter/orm-exporters/rails';
import { PrismaExporter } from '../../core/exporter/orm-exporters/prisma';
import { PostgreSQLConnector } from '../../core/database/connectors/postgresql';
import { MySQLConnector } from '../../core/database/connectors/mysql';
import { SQLiteConnector } from '../../core/database/connectors/sqlite';
import { SchemaConverter } from '../../core/database/schema-converter';
import { SchemaDefinition } from '../../types';
import * as fs from 'fs/promises';

export function createInteractiveCommand(): Command {
  const cmd = new Command('interactive');

  cmd
    .alias('i')
    .description('Run in interactive mode with guided configuration')
    .action(async () => {
      try {
        const interactive = new InteractiveMode();
        const config = await interactive.run();

        console.log('\n🚀 Starting generation...\n');

        let schema: SchemaDefinition;

        if (config.mode === 'file' && config.schemaSource) {
          const schemaContent = await fs.readFile(config.schemaSource, 'utf-8');
          const parser = new SQLParser();
          schema = parser.parseSchema(schemaContent);
        } else if (config.mode === 'database' && config.databaseConfig) {
          let connector;

          switch (config.databaseConfig.type) {
            case 'postgresql':
              connector = new PostgreSQLConnector(config.databaseConfig);
              break;
            case 'mysql':
              connector = new MySQLConnector(config.databaseConfig);
              break;
            case 'sqlite':
              connector = new SQLiteConnector(config.databaseConfig);
              break;
            default:
              throw new Error(`Unsupported database type: ${config.databaseConfig.type}`);
          }

          await connector.connect();
          const dbSchema = await connector.introspectSchema();
          schema = SchemaConverter.databaseSchemaToSchemaDefinition(dbSchema);
          await connector.disconnect();
        } else {
          throw new Error('Invalid configuration');
        }

        console.log(`Found ${schema.tables.length} table(s)\n`);

        const engine = new GenerationEngine();
        const tableData = await engine.generate(schema, config.generationOptions);

        console.log('\n✅ Generation complete\n');

        let output: string;

        switch (config.outputFormat) {
          case 'sql':
            const sqlExporter = new SQLExporter();
            output = sqlExporter.export(tableData, schema, config.generationOptions);
            break;

          case 'json':
            const jsonExporter = new JSONExporter();
            output = jsonExporter.export(tableData, schema, config.generationOptions);
            break;

          case 'csv':
            const csvExporter = new CSVExporter();
            output = csvExporter.export(tableData, schema, config.generationOptions);
            break;

          case 'django':
            const djangoExporter = new DjangoExporter();
            output = djangoExporter.export(tableData, schema, config.generationOptions);
            break;

          case 'rails':
            const railsExporter = new RailsExporter();
            output = railsExporter.export(tableData, schema, config.generationOptions);
            break;

          case 'prisma':
            const prismaExporter = new PrismaExporter();
            output = prismaExporter.export(tableData, schema, config.generationOptions);
            break;

          default:
            throw new Error(`Unsupported output format: ${config.outputFormat}`);
        }

        if (config.outputPath) {
          await fs.writeFile(config.outputPath, output, 'utf-8');
          console.log(`✅ Output written to ${config.outputPath}`);
        } else {
          console.log(output);
        }

        const stats = engine.getStatistics(tableData);
        console.log(`\n📊 Statistics:`);
        console.log(`   Total records: ${stats.totalRecords}`);
        console.log(`   Total tables: ${stats.totalTables}`);

      } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}
