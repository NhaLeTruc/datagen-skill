import { SQLParser } from '../../src/core/parser/sql-parser';
import { GenerationEngine } from '../../src/core/generator/engine';
import { ConstraintValidator } from '../../src/core/validator/constraint-validator';
import { GenerationOptions } from '../../types';

describe('Multi-table E-commerce Integration', () => {
  const ecommerceSchema = `
    CREATE TABLE categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT
    );

    CREATE TABLE products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      category_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE customers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP
    );

    CREATE TABLE orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      customer_id INT NOT NULL,
      order_date TIMESTAMP,
      total DECIMAL(10, 2),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `;

  describe('schema parsing', () => {
    it('should parse all tables', () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      expect(schema.tables).toHaveLength(5);

      const tableNames = schema.tables.map(t => t.name);
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('products');
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('order_items');
    });

    it('should parse all foreign keys', () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const allConstraints = schema.tables.flatMap(t => t.constraints);
      const foreignKeys = allConstraints.filter(c => c.type === 'FOREIGN_KEY');

      expect(foreignKeys.length).toBeGreaterThanOrEqual(4);
    });

    it('should parse unique constraints', () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const customersTable = schema.tables.find(t => t.name === 'customers');
      expect(customersTable).toBeDefined();

      const uniqueConstraints = customersTable!.constraints.filter(c => c.type === 'UNIQUE');
      expect(uniqueConstraints.length).toBeGreaterThan(0);
    });
  });

  describe('data generation', () => {
    const options: GenerationOptions = {
      count: 50,
      seed: 12345,
      locale: 'en_US',
      format: 'sql',
      validate: true
    };

    it('should generate data for all tables', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      expect(tableData).toHaveLength(5);

      const stats = engine.getStatistics(tableData);
      expect(stats.totalRecords).toBe(250);
    });

    it('should respect foreign key relationships', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const categories = tableData.find(t => t.table === 'categories')!;
      const products = tableData.find(t => t.table === 'products')!;

      const categoryIds = new Set(categories.records.map(r => r.id));

      for (const product of products.records) {
        expect(categoryIds.has(product.category_id)).toBe(true);
      }
    });

    it('should generate valid order-customer relationships', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const customers = tableData.find(t => t.table === 'customers')!;
      const orders = tableData.find(t => t.table === 'orders')!;

      const customerIds = new Set(customers.records.map(r => r.id));

      for (const order of orders.records) {
        expect(customerIds.has(order.customer_id)).toBe(true);
      }
    });

    it('should generate valid order_items relationships', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const orders = tableData.find(t => t.table === 'orders')!;
      const products = tableData.find(t => t.table === 'products')!;
      const orderItems = tableData.find(t => t.table === 'order_items')!;

      const orderIds = new Set(orders.records.map(r => r.id));
      const productIds = new Set(products.records.map(r => r.id));

      for (const item of orderItems.records) {
        expect(orderIds.has(item.order_id)).toBe(true);
        expect(productIds.has(item.product_id)).toBe(true);
      }
    });

    it('should maintain unique email addresses', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const customers = tableData.find(t => t.table === 'customers')!;
      const emails = customers.records.map(r => r.email);
      const uniqueEmails = new Set(emails);

      expect(uniqueEmails.size).toBe(emails.length);
    });
  });

  describe('constraint validation', () => {
    const options: GenerationOptions = {
      count: 30,
      seed: 12345,
      locale: 'en_US',
      format: 'sql',
      validate: true
    };

    it('should pass all constraint validations', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const allValid = validationResults.every(r => r.valid);
      expect(allValid).toBe(true);
    });

    it('should have no primary key violations', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const pkErrors = validationResults.flatMap(r => r.errors)
        .filter(e => e.type === 'PRIMARY_KEY');

      expect(pkErrors).toHaveLength(0);
    });

    it('should have no foreign key violations', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const fkErrors = validationResults.flatMap(r => r.errors)
        .filter(e => e.type === 'FOREIGN_KEY');

      expect(fkErrors).toHaveLength(0);
    });

    it('should have no unique constraint violations', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const uniqueErrors = validationResults.flatMap(r => r.errors)
        .filter(e => e.type === 'UNIQUE');

      expect(uniqueErrors).toHaveLength(0);
    });

    it('should have no NOT NULL violations', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const notNullErrors = validationResults.flatMap(r => r.errors)
        .filter(e => e.type === 'NOT_NULL');

      expect(notNullErrors).toHaveLength(0);
    });
  });

  describe('reproducibility', () => {
    const options: GenerationOptions = {
      count: 20,
      seed: 99999,
      locale: 'en_US',
      format: 'sql',
      validate: true
    };

    it('should generate identical data with same seed', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine1 = new GenerationEngine();
      const tableData1 = await engine1.generate(schema, options);

      const engine2 = new GenerationEngine();
      const tableData2 = await engine2.generate(schema, options);

      expect(tableData1).toEqual(tableData2);
    });

    it('should generate different data with different seeds', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine1 = new GenerationEngine();
      const tableData1 = await engine1.generate(schema, { ...options, seed: 11111 });

      const engine2 = new GenerationEngine();
      const tableData2 = await engine2.generate(schema, { ...options, seed: 22222 });

      expect(tableData1).not.toEqual(tableData2);
    });
  });

  describe('scalability', () => {
    it('should handle large record counts', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const options: GenerationOptions = {
        count: 100,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const stats = engine.getStatistics(tableData);
      expect(stats.totalRecords).toBe(500);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);
      const allValid = validationResults.every(r => r.valid);

      expect(allValid).toBe(true);
    }, 30000);
  });

  describe('data quality', () => {
    const options: GenerationOptions = {
      count: 50,
      seed: 12345,
      locale: 'en_US',
      format: 'sql',
      validate: true
    };

    it('should generate realistic customer names', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const customers = tableData.find(t => t.table === 'customers')!;

      for (const customer of customers.records) {
        expect(customer.first_name).toBeDefined();
        expect(customer.first_name.length).toBeGreaterThan(0);
        expect(customer.last_name).toBeDefined();
        expect(customer.last_name.length).toBeGreaterThan(0);
      }
    });

    it('should generate valid email addresses', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const customers = tableData.find(t => t.table === 'customers')!;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const customer of customers.records) {
        expect(emailRegex.test(customer.email)).toBe(true);
      }
    });

    it('should generate positive prices', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const products = tableData.find(t => t.table === 'products')!;

      for (const product of products.records) {
        expect(product.price).toBeGreaterThan(0);
      }
    });

    it('should generate non-negative stock quantities', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const products = tableData.find(t => t.table === 'products')!;

      for (const product of products.records) {
        expect(product.stock).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate positive order item quantities', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(ecommerceSchema);

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const orderItems = tableData.find(t => t.table === 'order_items')!;

      for (const item of orderItems.records) {
        expect(item.quantity).toBeGreaterThan(0);
      }
    });
  });
});
