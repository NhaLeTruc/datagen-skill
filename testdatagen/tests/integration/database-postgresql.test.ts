import { Pool } from 'pg';
import { GenerationEngine } from '../../src/core/generator/engine';
import { SQLParser } from '../../src/core/parser/sql-parser';
import { PostgreSQLConnector } from '../../src/core/database/connectors/postgresql';
import { SQLExporter } from '../../src/core/exporter/sql-exporter';

describe('PostgreSQL Integration', () => {
  let pool: Pool;
  let connector: PostgreSQLConnector;

  beforeAll(async () => {
    // Connect to PostgreSQL test database
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'testdatagen_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'test'
    });

    connector = new PostgreSQLConnector(pool);

    // Clean up any existing test tables
    await pool.query('DROP SCHEMA IF EXISTS test CASCADE');
    await pool.query('CREATE SCHEMA test');
    await pool.query('SET search_path TO test');
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    // Clean up tables after each test
    await pool.query('DROP SCHEMA IF EXISTS test CASCADE');
    await pool.query('CREATE SCHEMA test');
    await pool.query('SET search_path TO test');
  });

  describe('basic table generation', () => {
    it('generates and inserts data for single table', async () => {
      const schema = `
        CREATE TABLE test.users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // Create table
      await pool.query(schema);

      // Parse schema
      const parser = new SQLParser();
      const tables = parser.parse(schema);

      // Generate data
      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      // Export to SQL
      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      // Insert data
      await pool.query(sql);

      // Verify data
      const result = await pool.query('SELECT COUNT(*) FROM test.users');
      expect(parseInt(result.rows[0].count)).toBe(100);

      // Verify constraints
      const uniqueCheck = await pool.query('SELECT COUNT(DISTINCT email) FROM test.users');
      expect(parseInt(uniqueCheck.rows[0].count)).toBe(100);
    });

    it('respects NOT NULL constraints', async () => {
      const schema = `
        CREATE TABLE test.products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          description TEXT
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify no NULLs in NOT NULL columns
      const nullCheck = await pool.query(`
        SELECT COUNT(*) FROM test.products
        WHERE name IS NULL OR price IS NULL
      `);
      expect(parseInt(nullCheck.rows[0].count)).toBe(0);
    });

    it('handles UNIQUE constraints', async () => {
      const schema = `
        CREATE TABLE test.accounts (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 200, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify uniqueness
      const usernameCheck = await pool.query('SELECT COUNT(DISTINCT username) FROM test.accounts');
      const emailCheck = await pool.query('SELECT COUNT(DISTINCT email) FROM test.accounts');

      expect(parseInt(usernameCheck.rows[0].count)).toBe(200);
      expect(parseInt(emailCheck.rows[0].count)).toBe(200);
    });
  });

  describe('foreign key relationships', () => {
    it('maintains referential integrity', async () => {
      const schema = `
        CREATE TABLE test.customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE test.orders (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES test.customers(id),
          total DECIMAL(10,2) NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify no orphan records
      const orphanCheck = await pool.query(`
        SELECT COUNT(*) FROM test.orders o
        WHERE NOT EXISTS (SELECT 1 FROM test.customers c WHERE c.id = o.customer_id)
      `);
      expect(parseInt(orphanCheck.rows[0].count)).toBe(0);
    });

    it('handles multi-level foreign keys', async () => {
      const schema = `
        CREATE TABLE test.categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE test.products (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES test.categories(id),
          name VARCHAR(200) NOT NULL
        );

        CREATE TABLE test.inventory (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES test.products(id),
          quantity INTEGER NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 150, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify entire chain
      const chainCheck = await pool.query(`
        SELECT COUNT(*) FROM test.inventory i
        INNER JOIN test.products p ON i.product_id = p.id
        INNER JOIN test.categories c ON p.category_id = c.id
      `);
      expect(parseInt(chainCheck.rows[0].count)).toBeGreaterThan(0);
    });

    it('handles multiple foreign keys to same table', async () => {
      const schema = `
        CREATE TABLE test.employees (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE test.projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          manager_id INTEGER REFERENCES test.employees(id),
          lead_developer_id INTEGER REFERENCES test.employees(id)
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify both FKs are valid
      const fkCheck = await pool.query(`
        SELECT COUNT(*) FROM test.projects p
        WHERE (manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM test.employees WHERE id = p.manager_id))
           OR (lead_developer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM test.employees WHERE id = p.lead_developer_id))
      `);
      expect(parseInt(fkCheck.rows[0].count)).toBe(0);
    });
  });

  describe('CHECK constraints', () => {
    it('satisfies CHECK constraints', async () => {
      const schema = `
        CREATE TABLE test.products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL CHECK (price > 0),
          discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100)
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify CHECK constraints
      const priceCheck = await pool.query('SELECT COUNT(*) FROM test.products WHERE price <= 0');
      expect(parseInt(priceCheck.rows[0].count)).toBe(0);

      const discountCheck = await pool.query(`
        SELECT COUNT(*) FROM test.products
        WHERE discount_percent IS NOT NULL AND (discount_percent < 0 OR discount_percent > 100)
      `);
      expect(parseInt(discountCheck.rows[0].count)).toBe(0);
    });

    it('handles complex CHECK constraints', async () => {
      const schema = `
        CREATE TABLE test.events (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          CHECK (end_date >= start_date)
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify date constraint
      const dateCheck = await pool.query(`
        SELECT COUNT(*) FROM test.events WHERE end_date < start_date
      `);
      expect(parseInt(dateCheck.rows[0].count)).toBe(0);
    });
  });

  describe('PostgreSQL-specific types', () => {
    it('handles UUID type', async () => {
      const schema = `
        CREATE TABLE test.sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      const result = await pool.query('SELECT COUNT(*) FROM test.sessions');
      expect(parseInt(result.rows[0].count)).toBe(50);
    });

    it('handles JSONB type', async () => {
      const schema = `
        CREATE TABLE test.settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          preferences JSONB NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 30, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      // Verify JSONB is valid
      const result = await pool.query('SELECT preferences FROM test.settings LIMIT 1');
      expect(result.rows[0].preferences).toBeDefined();
    });

    it('handles ARRAY type', async () => {
      const schema = `
        CREATE TABLE test.tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          related_tags TEXT[]
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 20, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      const result = await pool.query('SELECT COUNT(*) FROM test.tags');
      expect(parseInt(result.rows[0].count)).toBe(20);
    });
  });

  describe('schema introspection', () => {
    it('introspects existing database schema', async () => {
      // Create test schema
      await pool.query(`
        CREATE TABLE test.users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE test.posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES test.users(id),
          title VARCHAR(200) NOT NULL,
          content TEXT
        );
      `);

      // Introspect
      const schema = await connector.introspectSchema('test');

      expect(schema).toHaveLength(2);

      const usersTable = schema.find(t => t.name === 'users');
      const postsTable = schema.find(t => t.name === 'posts');

      expect(usersTable).toBeDefined();
      expect(postsTable).toBeDefined();

      expect(usersTable!.columns.find(c => c.name === 'email')?.constraints.unique).toBe(true);
      expect(postsTable!.foreignKeys).toHaveLength(1);
    });

    it('generates data for introspected schema', async () => {
      await pool.query(`
        CREATE TABLE test.departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE test.employees (
          id SERIAL PRIMARY KEY,
          department_id INTEGER REFERENCES test.departments(id),
          name VARCHAR(100) NOT NULL,
          salary DECIMAL(10,2) CHECK (salary > 0)
        );
      `);

      const schema = await connector.introspectSchema('test');

      const engine = new GenerationEngine(schema, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, schema);

      await pool.query('TRUNCATE test.employees, test.departments RESTART IDENTITY CASCADE');
      await pool.query(sql);

      const deptResult = await pool.query('SELECT COUNT(*) FROM test.departments');
      const empResult = await pool.query('SELECT COUNT(*) FROM test.employees');

      expect(parseInt(deptResult.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(empResult.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('large datasets', () => {
    it('generates and inserts 10k records efficiently', async () => {
      const schema = `
        CREATE TABLE test.large_table (
          id SERIAL PRIMARY KEY,
          data VARCHAR(100) NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const startTime = Date.now();

      const engine = new GenerationEngine(tables, { count: 10000, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      await pool.query(sql);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result = await pool.query('SELECT COUNT(*) FROM test.large_table');
      expect(parseInt(result.rows[0].count)).toBe(10000);

      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
    }, 15000);
  });

  describe('transactions', () => {
    it('uses transactions for atomic inserts', async () => {
      const schema = `
        CREATE TABLE test.critical_data (
          id SERIAL PRIMARY KEY,
          value VARCHAR(100) NOT NULL
        );
      `;

      await pool.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter();
      const sql = exporter.export(data, tables);

      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(sql);

        const result = await client.query('SELECT COUNT(*) FROM test.critical_data');
        expect(parseInt(result.rows[0].count)).toBe(100);

        await client.query('ROLLBACK');

        // Verify rollback
        const afterRollback = await pool.query('SELECT COUNT(*) FROM test.critical_data');
        expect(parseInt(afterRollback.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });
  });
});
