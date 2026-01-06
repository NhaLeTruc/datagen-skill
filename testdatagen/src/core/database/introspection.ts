import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseSchema, DatabaseTable, DatabaseColumn, DatabaseForeignKey, DatabaseConnectionConfig } from './types';

const execAsync = promisify(exec);

export interface PrismaIntrospectionOptions {
  outputDir?: string;
  force?: boolean;
}

export class PrismaIntrospector {
  private connectionConfig: DatabaseConnectionConfig;

  constructor(connectionConfig: DatabaseConnectionConfig) {
    this.connectionConfig = connectionConfig;
  }

  async introspect(options?: PrismaIntrospectionOptions): Promise<DatabaseSchema> {
    const outputDir = options?.outputDir || path.join(process.cwd(), 'prisma-temp');
    const schemaPath = path.join(outputDir, 'schema.prisma');

    try {
      await fs.mkdir(outputDir, { recursive: true });

      await this.generatePrismaSchema(schemaPath);

      await this.runPrismaIntrospection(outputDir);

      const schema = await this.parsePrismaSchema(schemaPath);

      if (!options?.force) {
        await fs.rm(outputDir, { recursive: true, force: true });
      }

      return schema;
    } catch (error) {
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
      throw new Error(`Prisma introspection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generatePrismaSchema(schemaPath: string): Promise<void> {
    const datasourceUrl = this.buildDatasourceUrl();
    const provider = this.getPrismaProvider();

    const schemaContent = `
datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

    await fs.writeFile(schemaPath, schemaContent.trim());

    process.env.DATABASE_URL = datasourceUrl;
  }

  private buildDatasourceUrl(): string {
    const { type, host, port, database, username, password, filename, ssl } = this.connectionConfig;

    switch (type) {
      case 'postgresql':
        const pgPort = port || 5432;
        const pgHost = host || 'localhost';
        const sslParam = ssl ? '?sslmode=require' : '';
        return `postgresql://${username}:${password}@${pgHost}:${pgPort}/${database}${sslParam}`;

      case 'mysql':
        const mysqlPort = port || 3306;
        const mysqlHost = host || 'localhost';
        return `mysql://${username}:${password}@${mysqlHost}:${mysqlPort}/${database}`;

      case 'sqlite':
        return `file:${filename}`;

      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private getPrismaProvider(): string {
    switch (this.connectionConfig.type) {
      case 'postgresql':
        return 'postgresql';
      case 'mysql':
        return 'mysql';
      case 'sqlite':
        return 'sqlite';
      default:
        throw new Error(`Unsupported database type: ${this.connectionConfig.type}`);
    }
  }

  private async runPrismaIntrospection(outputDir: string): Promise<void> {
    const schemaPath = path.join(outputDir, 'schema.prisma');

    try {
      await execAsync(`npx prisma db pull --schema="${schemaPath}"`, {
        env: { ...process.env },
        cwd: outputDir
      });
    } catch (error) {
      throw new Error(`Prisma db pull failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async parsePrismaSchema(schemaPath: string): Promise<DatabaseSchema> {
    const content = await fs.readFile(schemaPath, 'utf-8');
    const tables = this.extractModels(content);

    return { tables };
  }

  private extractModels(schemaContent: string): DatabaseTable[] {
    const tables: DatabaseTable[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const tableName = match[1];
      const modelBody = match[2];

      const table = this.parseModel(tableName, modelBody);
      tables.push(table);
    }

    return tables;
  }

  private parseModel(tableName: string, modelBody: string): DatabaseTable {
    const lines = modelBody.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

    const columns: DatabaseColumn[] = [];
    const foreignKeys: DatabaseForeignKey[] = [];
    const uniqueConstraints: string[][] = [];
    const checkConstraints: string[] = [];

    for (const line of lines) {
      if (line.startsWith('@@')) {
        this.parseTableDirective(line, uniqueConstraints, checkConstraints);
      } else if (!line.startsWith('@') && line.includes(' ')) {
        const column = this.parseField(line, foreignKeys);
        if (column) {
          columns.push(column);
        }
      }
    }

    return {
      name: tableName,
      columns,
      foreignKeys,
      uniqueConstraints,
      checkConstraints
    };
  }

  private parseField(fieldLine: string, foreignKeys: DatabaseForeignKey[]): DatabaseColumn | null {
    const fieldMatch = fieldLine.match(/^(\w+)\s+(\w+)(\?|\[\])?(.*)$/);
    if (!fieldMatch) return null;

    const [, name, type, modifier, attributes] = fieldMatch;

    const nullable = modifier === '?';
    const isPrimaryKey = attributes.includes('@id');
    const isUnique = attributes.includes('@unique');

    let defaultValue: any;
    const defaultMatch = attributes.match(/@default\(([^)]+)\)/);
    if (defaultMatch) {
      defaultValue = defaultMatch[1];
    }

    const relationMatch = attributes.match(/@relation\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/);
    if (relationMatch) {
      const [, localField, referencedField] = relationMatch;
      const referencedTableMatch = fieldLine.match(/(\w+)(\?|\[\])?/);
      if (referencedTableMatch) {
        foreignKeys.push({
          column: localField,
          referencedTable: referencedTableMatch[1],
          referencedColumn: referencedField
        });
      }
    }

    const column: DatabaseColumn = {
      name,
      type: this.mapPrismaType(type),
      nullable,
      defaultValue,
      isPrimaryKey,
      isUnique,
      maxLength: undefined,
      precision: undefined,
      scale: undefined
    };

    return column;
  }

  private parseTableDirective(directive: string, uniqueConstraints: string[][], checkConstraints: string[]): void {
    const uniqueMatch = directive.match(/@@unique\(\[([^\]]+)\]/);
    if (uniqueMatch) {
      const columns = uniqueMatch[1].split(',').map(c => c.trim());
      uniqueConstraints.push(columns);
    }

    const indexMatch = directive.match(/@@index\(\[([^\]]+)\]/);
    if (indexMatch && directive.includes('unique')) {
      const columns = indexMatch[1].split(',').map(c => c.trim());
      uniqueConstraints.push(columns);
    }
  }

  private mapPrismaType(prismaType: string): string {
    const typeMap: Record<string, string> = {
      'Int': 'INT',
      'BigInt': 'BIGINT',
      'Float': 'FLOAT',
      'Decimal': 'DECIMAL',
      'String': 'VARCHAR',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP',
      'Json': 'JSON',
      'Bytes': 'BLOB'
    };

    return typeMap[prismaType] || 'VARCHAR';
  }

  static async introspectFromConfig(
    config: DatabaseConnectionConfig,
    options?: PrismaIntrospectionOptions
  ): Promise<DatabaseSchema> {
    const introspector = new PrismaIntrospector(config);
    return introspector.introspect(options);
  }
}
