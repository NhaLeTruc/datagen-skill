import {
  faker,
  fakerEN_US,
  fakerEN_GB,
  fakerDE,
  fakerFR,
  fakerEN_CA,
  fakerEN_AU
} from '@faker-js/faker';
import { ColumnDefinition, GenerationContext } from '../../types';

export type SupportedLocale = 'en_US' | 'en_GB' | 'de_DE' | 'fr_FR' | 'en_CA' | 'en_AU';

export class ValueGenerator {
  private seed?: number;
  private locale: SupportedLocale;
  private fakerInstance: typeof faker;

  constructor(seed?: number, locale: string = 'en_US') {
    this.seed = seed;
    this.locale = this.normalizeLocale(locale);
    this.fakerInstance = this.getFakerForLocale(this.locale);

    if (seed !== undefined) {
      this.fakerInstance.seed(seed);
    }
  }

  /**
   * Normalize locale string to supported locale
   */
  private normalizeLocale(locale: string): SupportedLocale {
    const normalized = locale.toLowerCase().replace('-', '_');

    const localeMap: Record<string, SupportedLocale> = {
      'en': 'en_US',
      'en_us': 'en_US',
      'us': 'en_US',
      'en_gb': 'en_GB',
      'uk': 'en_GB',
      'gb': 'en_GB',
      'de': 'de_DE',
      'de_de': 'de_DE',
      'fr': 'fr_FR',
      'fr_fr': 'fr_FR',
      'en_ca': 'en_CA',
      'ca': 'en_CA',
      'en_au': 'en_AU',
      'au': 'en_AU'
    };

    return localeMap[normalized] || 'en_US';
  }

  /**
   * Get Faker instance for specific locale
   */
  private getFakerForLocale(locale: SupportedLocale): typeof faker {
    switch (locale) {
      case 'en_US':
        return fakerEN_US;
      case 'en_GB':
        return fakerEN_GB;
      case 'de_DE':
        return fakerDE;
      case 'fr_FR':
        return fakerFR;
      case 'en_CA':
        return fakerEN_CA;
      case 'en_AU':
        return fakerEN_AU;
      default:
        return fakerEN_US;
    }
  }

  /**
   * Set Faker locale
   */
  public setLocale(locale: string): void {
    this.locale = this.normalizeLocale(locale);
    this.fakerInstance = this.getFakerForLocale(this.locale);

    if (this.seed !== undefined) {
      this.fakerInstance.seed(this.seed);
    }
  }

  /**
   * Get current locale
   */
  public getLocale(): SupportedLocale {
    return this.locale;
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
      return this.fakerInstance.internet.email();
    }

    if (this.isNameColumn(columnName)) {
      if (columnName.includes('first')) return this.fakerInstance.person.firstName();
      if (columnName.includes('last')) return this.fakerInstance.person.lastName();
      if (columnName.includes('full')) return this.fakerInstance.person.fullName();
      return this.fakerInstance.person.fullName();
    }

    if (this.isPhoneColumn(columnName)) {
      return this.fakerInstance.phone.number();
    }

    if (this.isAddressColumn(columnName)) {
      if (columnName.includes('street')) return this.fakerInstance.location.streetAddress();
      if (columnName.includes('city')) return this.fakerInstance.location.city();
      if (columnName.includes('state')) return this.fakerInstance.location.state();
      if (columnName.includes('zip') || columnName.includes('postal')) return this.fakerInstance.location.zipCode();
      if (columnName.includes('country')) return this.fakerInstance.location.country();
      return this.fakerInstance.location.streetAddress();
    }

    if (this.isCompanyColumn(columnName)) {
      return this.fakerInstance.company.name();
    }

    if (this.isDescriptionColumn(columnName)) {
      return this.fakerInstance.lorem.paragraph();
    }

    if (this.isUrlColumn(columnName)) {
      return this.fakerInstance.internet.url();
    }

    if (this.isUsernameColumn(columnName)) {
      return this.fakerInstance.internet.userName();
    }

    if (this.isPasswordColumn(columnName)) {
      return this.fakerInstance.internet.password();
    }

    switch (column.type) {
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
        return this.generateInteger(column);

      case 'SMALLINT':
        return this.fakerInstance.number.int({ min: -32768, max: 32767 });

      case 'TINYINT':
        return this.fakerInstance.number.int({ min: 0, max: 255 });

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
        return this.fakerInstance.datatype.boolean();

      case 'JSON':
      case 'JSONB':
        return this.generateJSON();

      case 'UUID':
        return this.fakerInstance.string.uuid();

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
    return this.fakerInstance.number.int({ min, max });
  }

  /**
   * Generate decimal value
   */
  private generateDecimal(column: ColumnDefinition): number {
    const precision = column.precision || 10;
    const scale = column.scale || 2;
    const max = Math.pow(10, precision - scale) - 1;
    return this.fakerInstance.number.float({ min: 0, max, multipleOf: Math.pow(10, -scale) });
  }

  /**
   * Generate string value
   */
  private generateString(column: ColumnDefinition): string {
    const maxLength = column.length || 255;

    if (maxLength <= 10) {
      return this.fakerInstance.string.alphanumeric(Math.min(maxLength, 8));
    } else if (maxLength <= 50) {
      return this.fakerInstance.lorem.word().substring(0, maxLength);
    } else if (maxLength <= 255) {
      return this.fakerInstance.lorem.sentence().substring(0, maxLength);
    } else {
      return this.fakerInstance.lorem.paragraphs(2).substring(0, maxLength);
    }
  }

  /**
   * Generate date value
   */
  private generateDate(): string {
    return this.fakerInstance.date.past({ years: 5 }).toISOString().split('T')[0];
  }

  /**
   * Generate datetime value
   */
  private generateDateTime(): string {
    return this.fakerInstance.date.past({ years: 5 }).toISOString();
  }

  /**
   * Generate time value
   */
  private generateTime(): string {
    const date = this.fakerInstance.date.recent();
    return date.toISOString().split('T')[1].split('.')[0];
  }

  /**
   * Generate JSON value
   */
  private generateJSON(): string {
    const obj = {
      id: this.fakerInstance.string.uuid(),
      value: this.fakerInstance.lorem.word(),
      timestamp: this.fakerInstance.date.recent().toISOString()
    };
    return JSON.stringify(obj);
  }

  /**
   * Generate binary value (as hex string)
   */
  private generateBinary(): string {
    return this.fakerInstance.string.hexadecimal({ length: 32, prefix: '' });
  }

  /**
   * Should generate null value (10% chance for nullable columns)
   */
  private shouldGenerateNull(): boolean {
    return this.fakerInstance.number.int({ min: 1, max: 100 }) <= 10;
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
      this.fakerInstance.seed(this.seed);
    }
  }
}
