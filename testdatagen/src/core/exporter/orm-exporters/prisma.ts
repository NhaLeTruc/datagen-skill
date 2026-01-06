import { TableData, SchemaDefinition, GenerationOptions } from '../../../types';

export class PrismaExporter {
  export(
    tableData: TableData[],
    schema: SchemaDefinition,
    options: GenerationOptions
  ): string {
    const seedCode = this.generateSeedScript(tableData, schema);
    return seedCode;
  }

  generateSeedScript(tableData: TableData[], schema: SchemaDefinition): string {
    const imports = this.generateImports();
    const mainFunction = this.generateMainFunction(tableData, schema);

    return `${imports}\n\n${mainFunction}\n\nmain()\n  .catch((e) => {\n    console.error(e);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n`;
  }

  private generateImports(): string {
    return `import { PrismaClient } from '@prisma/client';\n\nconst prisma = new PrismaClient();`;
  }

  private generateMainFunction(tableData: TableData[], schema: SchemaDefinition): string {
    const operations: string[] = [];

    for (const data of tableData) {
      const modelName = this.toPrismaModelName(data.table);
      const createOperations = this.generateCreateOperations(data, modelName);
      operations.push(createOperations);
    }

    return `async function main() {\n  console.log('Seeding database...');\n\n${operations.join('\n\n')}\n\n  console.log('Seeding completed!');\n}`;
  }

  private generateCreateOperations(data: TableData, modelName: string): string {
    const operations: string[] = [];

    operations.push(`  // Creating ${data.table} records`);

    for (let i = 0; i < data.records.length; i++) {
      const record = data.records[i];
      const dataObject = this.formatRecordForPrisma(record);

      operations.push(`  await prisma.${modelName}.create({\n    data: ${this.stringifyObject(dataObject, 4)}\n  });`);

      if (i < data.records.length - 1 && i % 10 === 9) {
        operations.push('');
      }
    }

    return operations.join('\n');
  }

  private formatRecordForPrisma(record: Record<string, any>): Record<string, any> {
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
      return value;
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

  private stringifyObject(obj: Record<string, any>, indent: number = 0): string {
    const entries: string[] = [];
    const indentStr = ' '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      const formattedValue = this.stringifyValue(value, indent + 2);
      entries.push(`${indentStr}${key}: ${formattedValue}`);
    }

    return `{\n${entries.join(',\n')}\n${' '.repeat(indent - 2)}}`;
  }

  private stringifyValue(value: any, indent: number): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (value instanceof Date) {
      return `new Date('${value.toISOString()}')`;
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

    if (Array.isArray(value)) {
      const items = value.map(v => this.stringifyValue(v, indent + 2));
      return `[${items.join(', ')}]`;
    }

    if (typeof value === 'object') {
      return this.stringifyObject(value, indent + 2);
    }

    return String(value);
  }

  private toPrismaModelName(tableName: string): string {
    const singular = this.singularize(tableName);
    return singular.charAt(0).toLowerCase() + singular.slice(1);
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

  exportWithUpsert(tableData: TableData[], schema: SchemaDefinition): string {
    const imports = this.generateImports();
    const mainFunction = this.generateUpsertMainFunction(tableData, schema);

    return `${imports}\n\n${mainFunction}\n\nmain()\n  .catch((e) => {\n    console.error(e);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n`;
  }

  private generateUpsertMainFunction(tableData: TableData[], schema: SchemaDefinition): string {
    const operations: string[] = [];

    for (const data of tableData) {
      const modelName = this.toPrismaModelName(data.table);
      const table = schema.tables.find(t => t.name === data.table);

      if (!table) continue;

      const pkColumn = this.findPrimaryKeyColumn(table);
      const upsertOperations = this.generateUpsertOperations(data, modelName, pkColumn);
      operations.push(upsertOperations);
    }

    return `async function main() {\n  console.log('Upserting database records...');\n\n${operations.join('\n\n')}\n\n  console.log('Upsert completed!');\n}`;
  }

  private findPrimaryKeyColumn(table: any): string {
    const pkConstraint = table.constraints.find((c: any) => c.type === 'PRIMARY_KEY');
    if (pkConstraint && pkConstraint.columns && pkConstraint.columns.length > 0) {
      return pkConstraint.columns[0];
    }
    return 'id';
  }

  private generateUpsertOperations(data: TableData, modelName: string, pkColumn: string): string {
    const operations: string[] = [];

    operations.push(`  // Upserting ${data.table} records`);

    for (const record of data.records) {
      const pkValue = record[pkColumn];
      const dataObject = this.formatRecordForPrisma(record);

      const whereClause = `{ ${pkColumn}: ${this.stringifyValue(pkValue, 4)} }`;
      const createClause = this.stringifyObject(dataObject, 6);
      const updateClause = this.stringifyObject(dataObject, 6);

      operations.push(`  await prisma.${modelName}.upsert({\n    where: ${whereClause},\n    create: ${createClause},\n    update: ${updateClause}\n  });`);
    }

    return operations.join('\n');
  }

  exportWithTransactions(tableData: TableData[], schema: SchemaDefinition): string {
    const imports = this.generateImports();
    const mainFunction = this.generateTransactionMainFunction(tableData, schema);

    return `${imports}\n\n${mainFunction}\n\nmain()\n  .catch((e) => {\n    console.error(e);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n`;
  }

  private generateTransactionMainFunction(tableData: TableData[], schema: SchemaDefinition): string {
    const operations: string[] = [];

    for (const data of tableData) {
      const modelName = this.toPrismaModelName(data.table);

      for (const record of data.records) {
        const dataObject = this.formatRecordForPrisma(record);
        operations.push(`    prisma.${modelName}.create({ data: ${this.stringifyObject(dataObject, 6)} })`);
      }
    }

    return `async function main() {\n  console.log('Seeding with transaction...');\n\n  await prisma.$transaction([\n${operations.join(',\n')}\n  ]);\n\n  console.log('Transaction completed!');\n}`;
  }

  exportAsJSON(tableData: TableData[], schema: SchemaDefinition): string {
    const data: Record<string, any[]> = {};

    for (const table of tableData) {
      const modelName = this.toPrismaModelName(table.table);
      data[modelName] = table.records.map(record => this.formatRecordForPrisma(record));
    }

    return JSON.stringify(data, null, 2);
  }

  exportSeparateFiles(tableData: TableData[], schema: SchemaDefinition): { model: string; content: string }[] {
    const result: { model: string; content: string }[] = [];

    for (const data of tableData) {
      const modelName = this.toPrismaModelName(data.table);
      const seedScript = this.generateSeedScript([data], schema);

      result.push({
        model: modelName,
        content: seedScript
      });
    }

    return result;
  }

  generateDeleteScript(tableData: TableData[]): string {
    const imports = this.generateImports();
    const modelNames = tableData.map(t => this.toPrismaModelName(t.table));

    const deleteOperations = modelNames
      .reverse()
      .map(model => `  await prisma.${model}.deleteMany({});`)
      .join('\n');

    return `${imports}\n\nasync function cleanup() {\n  console.log('Cleaning up database...');\n\n${deleteOperations}\n\n  console.log('Cleanup completed!');\n}\n\ncleanup()\n  .catch((e) => {\n    console.error(e);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n`;
  }
}
