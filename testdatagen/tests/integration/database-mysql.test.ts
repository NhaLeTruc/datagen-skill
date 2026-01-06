import mysql from 'mysql2/promise';
import { GenerationEngine } from '../../src/core/generator/engine';
import { SQLParser } from '../../src/core/parser/sql-parser';
import { MySQLConnector } from '../../src/core/database/connectors/mysql';
import { SQLExporter } from '../../src/core/exporter/sql-exporter';

describe('MySQL Integration', () => {
  let connection: mysql.Connection;
  let connector: MySQLConnector;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DB || 'testdatagen_test',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'test'
    });

    connector = new MySQLConnector(connection);

    // Clean up
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await connection.query<any[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS \`${table.table_name}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    await connection.end();
  });

  afterEach(async () => {
    // Clean up after each test
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await connection.query<any[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS \`${table.table_name}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  describe('basic table generation', () => {
    it('generates and inserts data for single table', async () => {
      const schema = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      const [rows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM users');
      expect(rows[0].count).toBe(100);

      // Verify uniqueness
      const [uniqueCheck] = await connection.query<any[]>(
        'SELECT COUNT(DISTINCT email) as count FROM users'
      );
      expect(uniqueCheck[0].count).toBe(100);
    });

    it('handles AUTO_INCREMENT correctly', async () => {
      const schema = `
        CREATE TABLE products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(200) NOT NULL
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify sequential IDs
      const [rows] = await connection.query<any[]>('SELECT id FROM products ORDER BY id');
      expect(rows.length).toBe(50);
      for (let i = 0; i < rows.length; i++) {
        expect(rows[i].id).toBe(i + 1);
      }
    });
  });

  describe('foreign key relationships', () => {
    it('maintains referential integrity', async () => {
      const schema = `
        CREATE TABLE customers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify no orphans
      const [orphans] = await connection.query<any[]>(`
        SELECT COUNT(*) as count FROM orders o
        WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)
      `);
      expect(orphans[0].count).toBe(0);
    });

    it('handles ON DELETE CASCADE', async () => {
      const schema = `
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );

        CREATE TABLE posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Delete a user and verify cascade
      await connection.query('DELETE FROM users WHERE id = 1');

      const [orphans] = await connection.query<any[]>(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = 1'
      );
      expect(orphans[0].count).toBe(0);
    });
  });

  describe('MySQL-specific features', () => {
    it('handles ENUM type', async () => {
      const schema = `
        CREATE TABLE tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending'
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify ENUM values
      const [rows] = await connection.query<any[]>('SELECT DISTINCT status FROM tasks');
      const statuses = rows.map(r => r.status);

      expect(statuses.every(s => ['pending', 'in_progress', 'completed'].includes(s))).toBe(true);
    });

    it('handles TEXT types correctly', async () => {
      const schema = `
        CREATE TABLE articles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          summary MEDIUMTEXT
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 30, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      const [rows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM articles');
      expect(rows[0].count).toBe(30);
    });

    it('handles JSON type', async () => {
      const schema = `
        CREATE TABLE settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          preferences JSON NOT NULL
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 20, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify JSON is valid
      const [rows] = await connection.query<any[]>('SELECT preferences FROM settings LIMIT 1');
      expect(rows[0].preferences).toBeDefined();
      expect(typeof rows[0].preferences).toBe('object');
    });
  });

  describe('indexes and constraints', () => {
    it('handles UNIQUE indexes', async () => {
      const schema = `
        CREATE TABLE accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(255) NOT NULL,
          UNIQUE KEY unique_username (username),
          UNIQUE KEY unique_email (email)
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify uniqueness
      const [usernames] = await connection.query<any[]>(
        'SELECT COUNT(DISTINCT username) as count FROM accounts'
      );
      const [emails] = await connection.query<any[]>(
        'SELECT COUNT(DISTINCT email) as count FROM accounts'
      );

      expect(usernames[0].count).toBe(100);
      expect(emails[0].count).toBe(100);
    });

    it('handles composite indexes', async () => {
      const schema = `
        CREATE TABLE order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          UNIQUE KEY unique_order_product (order_id, product_id)
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 200, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      // Verify composite uniqueness
      const [duplicates] = await connection.query<any[]>(`
        SELECT order_id, product_id, COUNT(*) as count
        FROM order_items
        GROUP BY order_id, product_id
        HAVING count > 1
      `);

      expect(duplicates.length).toBe(0);
    });
  });

  describe('schema introspection', () => {
    it('introspects existing MySQL schema', async () => {
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      const schema = await connector.introspectSchema();

      expect(schema).toHaveLength(2);

      const usersTable = schema.find(t => t.name === 'users');
      const postsTable = schema.find(t => t.name === 'posts');

      expect(usersTable).toBeDefined();
      expect(postsTable).toBeDefined();

      expect(usersTable!.columns.find(c => c.name === 'email')?.constraints.unique).toBe(true);
      expect(postsTable!.foreignKeys).toHaveLength(1);
    });
  });

  describe('character sets and collations', () => {
    it('handles UTF-8 data correctly', async () => {
      const schema = `
        CREATE TABLE international_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          bio TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 50, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      const [rows] = await connection.query<any[]>(
        'SELECT COUNT(*) as count FROM international_users'
      );
      expect(rows[0].count).toBe(50);
    });
  });

  describe('performance', () => {
    it('generates and inserts 10k records efficiently', async () => {
      const schema = `
        CREATE TABLE large_table (
          id INT AUTO_INCREMENT PRIMARY KEY,
          data VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const startTime = Date.now();

      const engine = new GenerationEngine(tables, { count: 10000, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query(sql);

      const endTime = Date.now();
      const duration = endTime - startTime;

      const [rows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM large_table');
      expect(rows[0].count).toBe(10000);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);
    }, 15000);

    it('uses batch inserts for efficiency', async () => {
      const schema = `
        CREATE TABLE batch_test (
          id INT AUTO_INCREMENT PRIMARY KEY,
          value VARCHAR(50) NOT NULL
        );
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 1000, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql', batchSize: 100 });
      const sql = exporter.export(data, tables);

      // Verify batch INSERT statements
      const insertStatements = sql.split('INSERT INTO');
      expect(insertStatements.length).toBeGreaterThan(1);

      await connection.query(sql);

      const [rows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM batch_test');
      expect(rows[0].count).toBe(1000);
    });
  });

  describe('transactions', () => {
    it('supports transactional inserts', async () => {
      const schema = `
        CREATE TABLE critical_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          value VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB;
      `;

      await connection.query(schema);

      const parser = new SQLParser();
      const tables = parser.parse(schema);

      const engine = new GenerationEngine(tables, { count: 100, seed: 42 });
      const data = engine.generate();

      const exporter = new SQLExporter({ dialect: 'mysql' });
      const sql = exporter.export(data, tables);

      await connection.query('START TRANSACTION');
      await connection.query(sql);

      const [beforeRollback] = await connection.query<any[]>(
        'SELECT COUNT(*) as count FROM critical_data'
      );
      expect(beforeRollback[0].count).toBe(100);

      await connection.query('ROLLBACK');

      const [afterRollback] = await connection.query<any[]>(
        'SELECT COUNT(*) as count FROM critical_data'
      );
      expect(afterRollback[0].count).toBe(0);
    });
  });
});
