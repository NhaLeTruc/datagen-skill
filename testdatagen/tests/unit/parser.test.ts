import { SQLParser } from '../../src/core/parser/sql-parser';
import { SchemaDefinition, TableSchema } from '../../src/types';

describe('SQLParser', () => {
  let parser: SQLParser;

  beforeEach(() => {
    parser = new SQLParser();
  });

  describe('parseSchema', () => {
    it('should parse a simple CREATE TABLE statement', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        );
      `;

      const schema = parser.parseSchema(sql);

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[0].columns).toHaveLength(2);
    });

    it('should parse multiple tables', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY
        );

        CREATE TABLE products (
          id INTEGER PRIMARY KEY
        );
      `;

      const schema = parser.parseSchema(sql);

      expect(schema.tables).toHaveLength(2);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[1].name).toBe('products');
    });

    it('should parse column with data types', () => {
      const sql = `
        CREATE TABLE test (
          int_col INTEGER,
          varchar_col VARCHAR(255),
          text_col TEXT,
          decimal_col DECIMAL(10, 2),
          date_col DATE,
          bool_col BOOLEAN
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];

      expect(table.columns[0].type).toBe('INTEGER');
      expect(table.columns[1].type).toBe('VARCHAR');
      expect(table.columns[1].length).toBe(255);
      expect(table.columns[2].type).toBe('TEXT');
      expect(table.columns[3].type).toBe('DECIMAL');
      expect(table.columns[3].precision).toBe(10);
      expect(table.columns[3].scale).toBe(2);
      expect(table.columns[4].type).toBe('DATE');
      expect(table.columns[5].type).toBe('BOOLEAN');
    });

    it('should parse NOT NULL constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];

      expect(table.columns[0].nullable).toBe(false);
      expect(table.columns[1].nullable).toBe(false);
      expect(table.columns[2].nullable).toBe(true);
    });

    it('should parse PRIMARY KEY constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const pkConstraint = table.constraints.find(c => c.type === 'PRIMARY_KEY');

      expect(pkConstraint).toBeDefined();
      expect(pkConstraint?.columns).toEqual(['id']);
    });

    it('should parse composite PRIMARY KEY', () => {
      const sql = `
        CREATE TABLE user_roles (
          user_id INTEGER,
          role_id INTEGER,
          PRIMARY KEY (user_id, role_id)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const pkConstraint = table.constraints.find(c => c.type === 'PRIMARY_KEY');

      expect(pkConstraint).toBeDefined();
      expect(pkConstraint?.columns).toEqual(['user_id', 'role_id']);
    });

    it('should parse FOREIGN KEY constraint', () => {
      const sql = `
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const fkConstraint = table.constraints.find(c => c.type === 'FOREIGN_KEY');

      expect(fkConstraint).toBeDefined();
      if (fkConstraint?.type === 'FOREIGN_KEY') {
        expect(fkConstraint.columns).toEqual(['user_id']);
        expect(fkConstraint.referencedTable).toBe('users');
        expect(fkConstraint.referencedColumns).toEqual(['id']);
      }
    });

    it('should parse FOREIGN KEY with ON DELETE CASCADE', () => {
      const sql = `
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const fkConstraint = table.constraints.find(c => c.type === 'FOREIGN_KEY');

      if (fkConstraint?.type === 'FOREIGN_KEY') {
        expect(fkConstraint.onDelete).toBeDefined();
      }
    });

    it('should parse UNIQUE constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          email VARCHAR(255) UNIQUE
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const uniqueConstraint = table.constraints.find(c => c.type === 'UNIQUE');

      expect(uniqueConstraint).toBeDefined();
      expect(uniqueConstraint?.columns).toEqual(['email']);
    });

    it('should parse composite UNIQUE constraint', () => {
      const sql = `
        CREATE TABLE user_permissions (
          user_id INTEGER,
          resource VARCHAR(100),
          action VARCHAR(50),
          UNIQUE (user_id, resource, action)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const uniqueConstraint = table.constraints.find(c => c.type === 'UNIQUE');

      expect(uniqueConstraint).toBeDefined();
      expect(uniqueConstraint?.columns).toEqual(['user_id', 'resource', 'action']);
    });

    it('should parse CHECK constraint', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          age INTEGER,
          CHECK (age >= 18)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const checkConstraint = table.constraints.find(c => c.type === 'CHECK');

      expect(checkConstraint).toBeDefined();
      if (checkConstraint?.type === 'CHECK') {
        expect(checkConstraint.expression).toContain('age');
        expect(checkConstraint.expression).toContain('18');
      }
    });

    it('should parse AUTO_INCREMENT', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const idColumn = table.columns.find(c => c.name === 'id');

      expect(idColumn?.autoIncrement).toBe(true);
    });

    it('should parse DEFAULT value', () => {
      const sql = `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const isActiveColumn = table.columns.find(c => c.name === 'is_active');

      expect(isActiveColumn?.defaultValue).toBeDefined();
    });

    it('should handle empty schema', () => {
      const sql = '';
      const schema = parser.parseSchema(sql);

      expect(schema.tables).toHaveLength(0);
    });

    it('should handle schema with comments', () => {
      const sql = `
        -- This is a comment
        CREATE TABLE users (
          id INTEGER PRIMARY KEY, -- ID column
          name VARCHAR(100) -- Name column
        );
      `;

      const schema = parser.parseSchema(sql);

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
    });

    it('should parse named constraints', () => {
      const sql = `
        CREATE TABLE orders (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `;

      const schema = parser.parseSchema(sql);
      const table = schema.tables[0];
      const fkConstraint = table.constraints.find(c => c.type === 'FOREIGN_KEY');

      expect(fkConstraint).toBeDefined();
      if (fkConstraint?.type === 'FOREIGN_KEY') {
        expect(fkConstraint.name).toBe('fk_user');
      }
    });

    it('should handle IF NOT EXISTS', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name VARCHAR(100)
        );
      `;

      const schema = parser.parseSchema(sql);

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
    });
  });
});
