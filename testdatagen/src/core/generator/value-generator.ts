import { faker } from '@faker-js/faker';
import { ColumnDefinition, GenerationContext } from '../../types';

export class ValueGenerator {
  private seed?: number;
  private locale: string;

  constructor(seed?: number, locale: string = 'en') {
    this.seed = seed;
    this.locale = locale;
    if (seed !== undefined) {
      faker.seed(seed);
    }
  }

  /**
   * Set Faker locale
   */
  public setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Generate value for a column
   */
  public generate(column: ColumnDefinition, context: GenerationContext): any {
    if (column.defaultValue !== undefined && !column.defaultValue) {
      return column.defaultValue;
    }

    if (column.nullable && this.shouldGenerateNull()) {
      return null;
    }

    return this.generateByType(column, context);
  }

  /**
   * Generate value based on column type
   */
  private generateByType(column: ColumnDefinition, context: GenerationContext): any {
    const columnName = column.name.toLowerCase();

    if (this.isEmailColumn(columnName)) {
      return faker.internet.email();
    }

    if (this.isNameColumn(columnName)) {
      if (columnName.includes('first')) return faker.person.firstName();
      if (columnName.includes('last')) return faker.person.lastName();
      if (columnName.includes('full')) return faker.person.fullName();
      return faker.person.fullName();
    }

    if (this.isPhoneColumn(columnName)) {
      return faker.phone.number();
    }

    if (this.isAddressColumn(columnName)) {
      if (columnName.includes('street')) return faker.location.streetAddress();
      if (columnName.includes('city')) return faker.location.city();
      if (columnName.includes('state')) return faker.location.state();
      if (columnName.includes('zip') || columnName.includes('postal')) return faker.location.zipCode();
      if (columnName.includes('country')) return faker.location.country();
      return faker.location.streetAddress();
    }

    if (this.isCompanyColumn(columnName)) {
      return faker.company.name();
    }

    if (this.isDescriptionColumn(columnName)) {
      return faker.lorem.paragraph();
    }

    if (this.isUrlColumn(columnName)) {
      return faker.internet.url();
    }

    if (this.isUsernameColumn(columnName)) {
      return faker.internet.userName();
    }

    if (this.isPasswordColumn(columnName)) {
      return faker.internet.password();
    }

    switch (column.type) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
        return this.generateInteger(column);

      case 'SMALLINT':
        return faker.number.int({ min: -32768, max: 32767 });

      case 'TINYINT':
        return faker.number.int({ min: 0, max: 255 });

      case 'DECIMAL':
      case 'NUMERIC':
      case 'FLOAT':
      case 'DOUBLE':
      case 'REAL':
        return this.generateDecimal(column);

      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
        return this.generateString(column);

      case 'DATE':
        return this.generateDate();

      case 'DATETIME':
      case 'TIMESTAMP':
        return this.generateDateTime();

      case 'TIME':
        return this.generateTime();

      case 'BOOLEAN':
      case 'BOOL':
        return faker.datatype.boolean();

      case 'JSON':
      case 'JSONB':
        return this.generateJSON();

      case 'UUID':
        return faker.string.uuid();

      case 'BLOB':
      case 'BINARY':
        return this.generateBinary();

      default:
        return this.generateString(column);
    }
  }

  /**
   * Generate integer value
   */
  private generateInteger(column: ColumnDefinition): number {
    const min = 1;
    const max = column.type === 'BIGINT' ? 2147483647 : 2147483647;
    return faker.number.int({ min, max });
  }

  /**
   * Generate decimal value
   */
  private generateDecimal(column: ColumnDefinition): number {
    const precision = column.precision || 10;
    const scale = column.scale || 2;
    const max = Math.pow(10, precision - scale) - 1;
    return faker.number.float({ min: 0, max, multipleOf: Math.pow(10, -scale) });
  }

  /**
   * Generate string value
   */
  private generateString(column: ColumnDefinition): string {
    const maxLength = column.length || 255;

    if (maxLength <= 10) {
      return faker.string.alphanumeric(Math.min(maxLength, 8));
    } else if (maxLength <= 50) {
      return faker.lorem.word().substring(0, maxLength);
    } else if (maxLength <= 255) {
      return faker.lorem.sentence().substring(0, maxLength);
    } else {
      return faker.lorem.paragraphs(2).substring(0, maxLength);
    }
  }

  /**
   * Generate date value
   */
  private generateDate(): string {
    return faker.date.past({ years: 5 }).toISOString().split('T')[0];
  }

  /**
   * Generate datetime value
   */
  private generateDateTime(): string {
    return faker.date.past({ years: 5 }).toISOString();
  }

  /**
   * Generate time value
   */
  private generateTime(): string {
    const date = faker.date.recent();
    return date.toISOString().split('T')[1].split('.')[0];
  }

  /**
   * Generate JSON value
   */
  private generateJSON(): string {
    const obj = {
      id: faker.string.uuid(),
      value: faker.lorem.word(),
      timestamp: faker.date.recent().toISOString()
    };
    return JSON.stringify(obj);
  }

  /**
   * Generate binary value (as hex string)
   */
  private generateBinary(): string {
    return faker.string.hexadecimal({ length: 32, prefix: '' });
  }

  /**
   * Should generate null value (10% chance for nullable columns)
   */
  private shouldGenerateNull(): boolean {
    return faker.number.int({ min: 1, max: 100 }) <= 10;
  }

  /**
   * Column name pattern matching helpers
   */
  private isEmailColumn(name: string): boolean {
    return name.includes('email') || name.includes('mail');
  }

  private isNameColumn(name: string): boolean {
    return name.includes('name') && !name.includes('username');
  }

  private isPhoneColumn(name: string): boolean {
    return name.includes('phone') || name.includes('mobile') || name.includes('tel');
  }

  private isAddressColumn(name: string): boolean {
    return name.includes('address') || name.includes('street') ||
           name.includes('city') || name.includes('state') ||
           name.includes('zip') || name.includes('postal') ||
           name.includes('country');
  }

  private isCompanyColumn(name: string): boolean {
    return name.includes('company') || name.includes('organization') || name.includes('org');
  }

  private isDescriptionColumn(name: string): boolean {
    return name.includes('description') || name.includes('desc') ||
           name.includes('comment') || name.includes('note') ||
           name.includes('bio');
  }

  private isUrlColumn(name: string): boolean {
    return name.includes('url') || name.includes('website') || name.includes('link');
  }

  private isUsernameColumn(name: string): boolean {
    return name.includes('username') || name === 'user' || name === 'login';
  }

  private isPasswordColumn(name: string): boolean {
    return name.includes('password') || name.includes('passwd') || name.includes('pwd');
  }

  /**
   * Reset faker seed
   */
  public reset(): void {
    if (this.seed !== undefined) {
      faker.seed(this.seed);
    }
  }
}
