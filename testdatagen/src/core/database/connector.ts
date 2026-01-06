import { DatabaseConnectionConfig, DatabaseSchema, IntrospectionOptions } from './types';

export abstract class DatabaseConnector {
  protected config: DatabaseConnectionConfig;
  protected connected: boolean = false;

  constructor(config: DatabaseConnectionConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract introspectSchema(options?: IntrospectionOptions): Promise<DatabaseSchema>;
  abstract testConnection(): Promise<boolean>;

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): DatabaseConnectionConfig {
    return { ...this.config };
  }

  protected validateConnection(): void {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}
