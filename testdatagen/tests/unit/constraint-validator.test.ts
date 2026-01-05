import { ConstraintValidator } from '../../src/core/validator/constraint-validator';
import { TableSchema, GeneratedRecord, TableData } from '../../src/types';

describe('ConstraintValidator', () => {
  let validator: ConstraintValidator;

  beforeEach(() => {
    validator = new ConstraintValidator();
  });

  const createTable = (name: string, columns: any[], constraints: any[]): TableSchema => ({
    name,
    columns,
    constraints
  });

  describe('validate - Primary Keys', () => {
    it('should pass with unique primary keys', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const records: GeneratedRecord[] = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with duplicate primary keys', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const records: GeneratedRecord[] = [
        { id: 1 },
        { id: 2 },
        { id: 1 }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('PRIMARY_KEY');
    });

    it('should fail with null primary key', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const records: GeneratedRecord[] = [
        { id: 1 },
        { id: null }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'PRIMARY_KEY')).toBe(true);
    });

    it('should validate composite primary keys', () => {
      const table = createTable('user_roles', [
        { name: 'user_id', type: 'INTEGER', nullable: false },
        { name: 'role_id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['user_id', 'role_id'] }
      ]);

      const records: GeneratedRecord[] = [
        { user_id: 1, role_id: 1 },
        { user_id: 1, role_id: 2 },
        { user_id: 2, role_id: 1 }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(true);
    });
  });

  describe('validate - NOT NULL', () => {
    it('should pass with non-null values', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false }
      ], []);

      const records: GeneratedRecord[] = [
        { id: 1, email: 'test@example.com' }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(true);
    });

    it('should fail with null values in NOT NULL columns', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false }
      ], []);

      const records: GeneratedRecord[] = [
        { id: 1, email: null }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'NOT_NULL')).toBe(true);
    });

    it('should allow null in nullable columns', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'phone', type: 'VARCHAR', nullable: true }
      ], []);

      const records: GeneratedRecord[] = [
        { id: 1, phone: null }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(true);
    });
  });

  describe('validate - UNIQUE', () => {
    it('should pass with unique values', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false }
      ], [
        { type: 'UNIQUE', columns: ['email'] }
      ]);

      const records: GeneratedRecord[] = [
        { id: 1, email: 'test1@example.com' },
        { id: 2, email: 'test2@example.com' }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(true);
    });

    it('should fail with duplicate unique values', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: false }
      ], [
        { type: 'UNIQUE', columns: ['email'] }
      ]);

      const records: GeneratedRecord[] = [
        { id: 1, email: 'test@example.com' },
        { id: 2, email: 'test@example.com' }
      ];

      const result = validator.validate(table, records);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'UNIQUE')).toBe(true);
    });
  });

  describe('validate - Foreign Keys', () => {
    it('should pass with valid foreign key references', () => {
      const usersTable = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const ordersTable = createTable('orders', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'FOREIGN_KEY', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] }
      ]);

      const usersData: TableData = {
        table: 'users',
        records: [{ id: 1 }, { id: 2 }]
      };

      const ordersData: TableData = {
        table: 'orders',
        records: [
          { id: 1, user_id: 1 },
          { id: 2, user_id: 2 }
        ]
      };

      const result = validator.validate(ordersTable, ordersData.records, [usersData, ordersData]);

      expect(result.valid).toBe(true);
    });

    it('should fail with invalid foreign key references', () => {
      const usersTable = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'PRIMARY_KEY', columns: ['id'] }
      ]);

      const ordersTable = createTable('orders', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: false }
      ], [
        { type: 'FOREIGN_KEY', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] }
      ]);

      const usersData: TableData = {
        table: 'users',
        records: [{ id: 1 }, { id: 2 }]
      };

      const ordersData: TableData = {
        table: 'orders',
        records: [
          { id: 1, user_id: 99 }
        ]
      };

      const result = validator.validate(ordersTable, ordersData.records, [usersData, ordersData]);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'FOREIGN_KEY')).toBe(true);
    });

    it('should allow null foreign keys', () => {
      const ordersTable = createTable('orders', [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: true }
      ], [
        { type: 'FOREIGN_KEY', columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] }
      ]);

      const usersData: TableData = {
        table: 'users',
        records: [{ id: 1 }]
      };

      const ordersData: TableData = {
        table: 'orders',
        records: [{ id: 1, user_id: null }]
      };

      const result = validator.validate(ordersTable, ordersData.records, [usersData, ordersData]);

      expect(result.valid).toBe(true);
    });
  });

  describe('validate - Data Types', () => {
    it('should validate integer types', () => {
      const table = createTable('users', [
        { name: 'id', type: 'INTEGER', nullable: false }
      ], []);

      const validRecords: GeneratedRecord[] = [{ id: 123 }];
      const invalidRecords: GeneratedRecord[] = [{ id: 'not a number' }];

      const validResult = validator.validate(table, validRecords);
      const invalidResult = validator.validate(table, invalidRecords);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate string types', () => {
      const table = createTable('users', [
        { name: 'name', type: 'VARCHAR', length: 10, nullable: false }
      ], []);

      const validRecords: GeneratedRecord[] = [{ name: 'John' }];
      const invalidRecords: GeneratedRecord[] = [{ name: 12345 }];

      const validResult = validator.validate(table, validRecords);
      const invalidResult = validator.validate(table, invalidRecords);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate string length', () => {
      const table = createTable('users', [
        { name: 'code', type: 'VARCHAR', length: 5, nullable: false }
      ], []);

      const validRecords: GeneratedRecord[] = [{ code: 'ABC' }];
      const invalidRecords: GeneratedRecord[] = [{ code: 'ABCDEFGHIJ' }];

      const validResult = validator.validate(table, validRecords);
      const invalidResult = validator.validate(table, invalidRecords);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate boolean types', () => {
      const table = createTable('users', [
        { name: 'is_active', type: 'BOOLEAN', nullable: false }
      ], []);

      const validRecords: GeneratedRecord[] = [{ is_active: true }];
      const invalidRecords: GeneratedRecord[] = [{ is_active: 'yes' }];

      const validResult = validator.validate(table, validRecords);
      const invalidResult = validator.validate(table, invalidRecords);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should provide summary of validation results', () => {
      const results = [
        { valid: true, table: 'users', errors: [] },
        { valid: false, table: 'orders', errors: [
          { type: 'PRIMARY_KEY' as const, message: 'Duplicate PK' },
          { type: 'NOT_NULL' as const, message: 'NULL value' }
        ] }
      ];

      const summary = validator.getValidationSummary(results);

      expect(summary.totalTables).toBe(2);
      expect(summary.validTables).toBe(1);
      expect(summary.invalidTables).toBe(1);
      expect(summary.totalErrors).toBe(2);
      expect(summary.errorsByType['PRIMARY_KEY']).toBe(1);
      expect(summary.errorsByType['NOT_NULL']).toBe(1);
    });
  });
});
