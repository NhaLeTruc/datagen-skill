import { GenerationEngine } from '../src/core/generator/engine';
import { SQLParser } from '../src/core/parser/sql-parser';
import { TableSchema } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  recordCount: number;
  duration: number; // milliseconds
  recordsPerSecond: number;
  memoryUsed: number; // bytes
  success: boolean;
  error?: string;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async run() {
    console.log('🚀 Starting Performance Benchmarks\n');

    // Benchmark 1: Single table generation
    await this.benchmarkSingleTable(10000);
    await this.benchmarkSingleTable(100000);
    await this.benchmarkSingleTable(1000000);

    // Benchmark 2: Multi-table generation
    await this.benchmarkMultiTable(10000);
    await this.benchmarkMultiTable(100000);

    // Benchmark 3: Complex schema with FKs
    await this.benchmarkComplexSchema(10000);
    await this.benchmarkComplexSchema(100000);

    // Benchmark 4: Self-referencing tables
    await this.benchmarkSelfReferencing(10000);

    // Benchmark 5: Large text fields
    await this.benchmarkLargeTextFields(10000);

    // Generate report
    this.generateReport();
  }

  private async benchmarkSingleTable(count: number) {
    const name = `Single Table (${this.formatNumber(count)} records)`;
    console.log(`Running: ${name}...`);

    const schema = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        age INTEGER,
        created_at TIMESTAMP
      );
    `;

    await this.runBenchmark(name, schema, count);
  }

  private async benchmarkMultiTable(count: number) {
    const name = `Multi-Table E-commerce (${this.formatNumber(count)} records)`;
    console.log(`Running: ${name}...`);

    const schema = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE orders (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        total DECIMAL(10,2) NOT NULL
      );
    `;

    await this.runBenchmark(name, schema, count);
  }

  private async benchmarkComplexSchema(count: number) {
    const name = `Complex Schema (${this.formatNumber(count)} records)`;
    console.log(`Running: ${name}...`);

    const schema = `
      CREATE TABLE countries (
        id INTEGER PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(2) UNIQUE NOT NULL
      );

      CREATE TABLE regions (
        id INTEGER PRIMARY KEY,
        country_id INTEGER NOT NULL REFERENCES countries(id),
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE cities (
        id INTEGER PRIMARY KEY,
        region_id INTEGER NOT NULL REFERENCES regions(id),
        name VARCHAR(100) NOT NULL,
        population INTEGER
      );

      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        city_id INTEGER NOT NULL REFERENCES cities(id),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL
      );

      CREATE TABLE businesses (
        id INTEGER PRIMARY KEY,
        city_id INTEGER NOT NULL REFERENCES cities(id),
        owner_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR(200) NOT NULL,
        revenue DECIMAL(12,2)
      );
    `;

    await this.runBenchmark(name, schema, count);
  }

  private async benchmarkSelfReferencing(count: number) {
    const name = `Self-Referencing (${this.formatNumber(count)} records)`;
    console.log(`Running: ${name}...`);

    const schema = `
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY,
        manager_id INTEGER REFERENCES employees(id),
        name VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        salary DECIMAL(10,2)
      );
    `;

    await this.runBenchmark(name, schema, count);
  }

  private async benchmarkLargeTextFields(count: number) {
    const name = `Large Text Fields (${this.formatNumber(count)} records)`;
    console.log(`Running: ${name}...`);

    const schema = `
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        metadata TEXT
      );
    `;

    await this.runBenchmark(name, schema, count);
  }

  private async runBenchmark(name: string, schemaSQL: string, count: number) {
    const parser = new SQLParser();
    let tables: TableSchema[];

    try {
      tables = parser.parse(schemaSQL);
    } catch (error: any) {
      this.results.push({
        name,
        recordCount: count,
        duration: 0,
        recordsPerSecond: 0,
        memoryUsed: 0,
        success: false,
        error: `Schema parsing failed: ${error.message}`
      });
      console.log(`  ❌ Failed: ${error.message}\n`);
      return;
    }

    // Force garbage collection before benchmark
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    try {
      const engine = new GenerationEngine(tables, { count, seed: 42 });
      const data = engine.generate();

      const endTime = Date.now();
      const memoryAfter = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryUsed = memoryAfter - memoryBefore;
      const recordsPerSecond = Math.round((count / duration) * 1000);

      this.results.push({
        name,
        recordCount: count,
        duration,
        recordsPerSecond,
        memoryUsed,
        success: true
      });

      console.log(`  ✅ Completed in ${duration}ms (${recordsPerSecond} records/sec, ${this.formatBytes(memoryUsed)} memory)\n`);
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.results.push({
        name,
        recordCount: count,
        duration,
        recordsPerSecond: 0,
        memoryUsed: 0,
        success: false,
        error: error.message
      });

      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }

  private generateReport() {
    console.log('\n📊 Benchmark Results Summary\n');
    console.log('='.repeat(100));
    console.log(
      this.padRight('Benchmark', 50) +
      this.padLeft('Records', 12) +
      this.padLeft('Time', 10) +
      this.padLeft('Rec/Sec', 12) +
      this.padLeft('Memory', 14)
    );
    console.log('='.repeat(100));

    for (const result of this.results) {
      if (result.success) {
        console.log(
          this.padRight(`✅ ${result.name}`, 50) +
          this.padLeft(this.formatNumber(result.recordCount), 12) +
          this.padLeft(`${result.duration}ms`, 10) +
          this.padLeft(this.formatNumber(result.recordsPerSecond), 12) +
          this.padLeft(this.formatBytes(result.memoryUsed), 14)
        );
      } else {
        console.log(
          this.padRight(`❌ ${result.name}`, 50) +
          this.padLeft(this.formatNumber(result.recordCount), 12) +
          this.padLeft('FAILED', 10) +
          this.padLeft('-', 12) +
          this.padLeft('-', 14)
        );
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    }

    console.log('='.repeat(100));

    // Check critical performance thresholds
    console.log('\n🎯 Performance Thresholds\n');

    const threshold1M = this.results.find(r => r.name.includes('1,000,000') && r.success);
    if (threshold1M) {
      const passed = threshold1M.duration < 60000; // < 60 seconds
      console.log(`1M records in <60s: ${passed ? '✅ PASS' : '❌ FAIL'} (${threshold1M.duration}ms)`);
    }

    const threshold100k = this.results.find(r => r.name.includes('100,000') && r.success);
    if (threshold100k) {
      const passed = threshold100k.duration < 30000; // < 30 seconds
      console.log(`100k records in <30s: ${passed ? '✅ PASS' : '❌ FAIL'} (${threshold100k.duration}ms)`);
    }

    const threshold10k = this.results.find(r => r.name.includes('10,000') && r.success);
    if (threshold10k) {
      const passed = threshold10k.duration < 5000; // < 5 seconds
      console.log(`10k records in <5s: ${passed ? '✅ PASS' : '❌ FAIL'} (${threshold10k.duration}ms)`);
    }

    // Save results to JSON
    const outputDir = path.join(__dirname, 'results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(
      outputFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          platform: {
            node: process.version,
            platform: process.platform,
            arch: process.arch
          },
          results: this.results
        },
        null,
        2
      )
    );

    console.log(`\n💾 Results saved to: ${outputFile}\n`);
  }

  private formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  }

  private padRight(str: string, length: number): string {
    return str.padEnd(length);
  }

  private padLeft(str: string, length: number): string {
    return str.padStart(length);
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run()
    .then(() => {
      console.log('✨ Benchmarks completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export { PerformanceBenchmark, BenchmarkResult };
