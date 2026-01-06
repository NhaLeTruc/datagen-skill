import { Command } from 'commander';
import { PostgreSQLConnector } from '../../core/database/connectors/postgresql';
import { MySQLConnector } from '../../core/database/connectors/mysql';
import { SQLiteConnector } from '../../core/database/connectors/sqlite';
import { PrismaIntrospector } from '../../core/database/introspection';
import { DatabaseConnector } from '../../core/database/connector';
import { DatabaseConnectionConfig } from '../../core/database/types';
import * as fs from 'fs/promises';

export function createIntrospectCommand(): Command {
  const cmd = new Command('introspect');

  cmd
    .description('Introspect database schema and generate SQL DDL')
    .option('-t, --type <type>', 'Database type (postgresql, mysql, sqlite)', 'postgresql')
    .option('-h, --host <host>', 'Database host', 'localhost')
    .option('-p, --port <port>', 'Database port')
    .option('-d, --database <database>', 'Database name')
    .option('-u, --username <username>', 'Database username')
    .option('-w, --password <password>', 'Database password')
    .option('-f, --file <file>', 'SQLite database file')
    .option('--ssl', 'Use SSL connection', false)
    .option('-o, --output <output>', 'Output file path')
    .option('--include <tables>', 'Comma-separated list of tables to include')
    .option('--exclude <tables>', 'Comma-separated list of tables to exclude')
    .option('--prisma', 'Use Prisma for introspection', false)
    .option('--format <format>', 'Output format (sql, json)', 'sql')
    .action(async (options) => {
      try {
        console.log('🔍 Introspecting database schema...\n');

        const config: DatabaseConnectionConfig = {
          type: options.type,
          host: options.host,
          port: options.port ? parseInt(options.port) : undefined,
          database: options.database,
          username: options.username,
          password: options.password,
          filename: options.file,
          ssl: options.ssl
        };

        const introspectionOptions = {
          includeTables: options.include ? options.include.split(',').map((t: string) => t.trim()) : undefined,
          excludeTables: options.exclude ? options.exclude.split(',').map((t: string) => t.trim()) : undefined
        };

        let schema;

        if (options.prisma) {
          console.log('Using Prisma introspection...');
          const introspector = new PrismaIntrospector(config);
          schema = await introspector.introspect();
        } else {
          const connector = createConnector(config);
          await connector.connect();
          console.log('✅ Connected to database\n');

          schema = await connector.introspectSchema(introspectionOptions);
          await connector.disconnect();
        }

        console.log(`Found ${schema.tables.length} table(s)\n`);

        let output: string;

        if (options.format === 'json') {
          output = JSON.stringify(schema, null, 2);
        } else {
          output = convertSchemaToSQL(schema);
        }

        if (options.output) {
          await fs.writeFile(options.output, output, 'utf-8');
          console.log(`✅ Schema written to ${options.output}`);
        } else {
          console.log(output);
        }

      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

function createConnector(config: DatabaseConnectionConfig): DatabaseConnector {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLConnector(config);
    case 'mysql':
      return new MySQLConnector(config);
    case 'sqlite':
      return new SQLiteConnector(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

function convertSchemaToSQL(schema: any): string {
  const lines: string[] = [];

  for (const table of schema.tables) {
    lines.push(`CREATE TABLE ${table.name} (`);

    const columnLines: string[] = [];

    for (const column of table.columns) {
      let columnDef = `  ${column.name} ${column.type}`;

      if (column.maxLength) {
        columnDef += `(${column.maxLength})`;
      } else if (column.precision && column.scale !== undefined) {
        columnDef += `(${column.precision}, ${column.scale})`;
      }

      if (column.isPrimaryKey) {
        columnDef += ' PRIMARY KEY';
      }

      if (!column.nullable) {
        columnDef += ' NOT NULL';
      }

      if (column.isUnique && !column.isPrimaryKey) {
        columnDef += ' UNIQUE';
      }

      if (column.defaultValue !== null && column.defaultValue !== undefined) {
        columnDef += ` DEFAULT ${column.defaultValue}`;
      }

      columnLines.push(columnDef);
    }

    for (const fk of table.foreignKeys) {
      columnLines.push(
        `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn})`
      );
    }

    for (const uniqueConstraint of table.uniqueConstraints) {
      columnLines.push(`  UNIQUE (${uniqueConstraint.join(', ')})`);
    }

    for (const checkConstraint of table.checkConstraints) {
      columnLines.push(`  CHECK (${checkConstraint})`);
    }

    lines.push(columnLines.join(',\n'));
    lines.push(');\n');
  }

  return lines.join('\n');
}
