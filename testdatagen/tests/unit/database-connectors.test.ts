import { PostgreSQLConnector } from '../../src/core/database/connectors/postgresql';
import { MySQLConnector } from '../../src/core/database/connectors/mysql';
import { SQLiteConnector } from '../../src/core/database/connectors/sqlite';
import { DatabaseConnectionConfig } from '../../src/core/database/types';

describe('Database Connectors', () => {
  describe('PostgreSQLConnector', () => {
    it('should create connector with valid config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass'
      };

      const connector = new PostgreSQLConnector(config);
      expect(connector).toBeDefined();
      expect(connector.isConnected()).toBe(false);
    });

    it('should return config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass'
      };

      const connector = new PostgreSQLConnector(config);
      const returnedConfig = connector.getConfig();

      expect(returnedConfig.type).toBe('postgresql');
      expect(returnedConfig.host).toBe('localhost');
      expect(returnedConfig.port).toBe(5432);
    });
  });

  describe('MySQLConnector', () => {
    it('should create connector with valid config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'user',
        password: 'pass'
      };

      const connector = new MySQLConnector(config);
      expect(connector).toBeDefined();
      expect(connector.isConnected()).toBe(false);
    });

    it('should return config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'user',
        password: 'pass'
      };

      const connector = new MySQLConnector(config);
      const returnedConfig = connector.getConfig();

      expect(returnedConfig.type).toBe('mysql');
      expect(returnedConfig.host).toBe('localhost');
      expect(returnedConfig.port).toBe(3306);
    });
  });

  describe('SQLiteConnector', () => {
    it('should create connector with valid config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'sqlite',
        database: '',
        filename: ':memory:'
      };

      const connector = new SQLiteConnector(config);
      expect(connector).toBeDefined();
      expect(connector.isConnected()).toBe(false);
    });

    it('should return config', () => {
      const config: DatabaseConnectionConfig = {
        type: 'sqlite',
        database: '',
        filename: '/tmp/test.db'
      };

      const connector = new SQLiteConnector(config);
      const returnedConfig = connector.getConfig();

      expect(returnedConfig.type).toBe('sqlite');
      expect(returnedConfig.filename).toBe('/tmp/test.db');
    });

    it('should throw error when filename missing', async () => {
      const config: DatabaseConnectionConfig = {
        type: 'sqlite',
        database: ''
      };

      const connector = new SQLiteConnector(config);

      await expect(connector.connect()).rejects.toThrow('SQLite filename is required');
    });
  });
});
