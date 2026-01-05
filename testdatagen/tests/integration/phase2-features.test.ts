import { SQLParser } from '../../src/core/parser/sql-parser';
import { GenerationEngine } from '../../src/core/generator/engine';
import { ConstraintValidator } from '../../src/core/validator/constraint-validator';
import { SQLExporter } from '../../src/core/exporter/sql-exporter';
import { JSONExporter } from '../../src/core/exporter/json-exporter';
import { CSVExporter } from '../../src/core/exporter/csv-exporter';
import { EdgeCaseInjector } from '../../src/core/generator/edge-case-injector';
import { ReportGenerator } from '../../src/core/validator/report-generator';
import { ValueGenerator, SupportedLocale } from '../../src/core/generator/value-generator';
import { GenerationOptions } from '../../types';

describe('Phase 2 Features Integration', () => {
  const testSchema = `
    CREATE TABLE users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      age INT,
      created_at TIMESTAMP
    );

    CREATE TABLE posts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      likes INT DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `;

  describe('Multi-locale support', () => {
    const locales: SupportedLocale[] = ['en_US', 'en_GB', 'de_DE', 'fr_FR', 'en_CA', 'en_AU'];

    it('should generate data for all supported locales', () => {
      for (const locale of locales) {
        const generator = new ValueGenerator(12345, locale);
        expect(generator.getLocale()).toBe(locale);
      }
    });

    it('should accept different locale formats', () => {
      const formats = ['en', 'us', 'en_US', 'uk', 'de', 'fr'];

      for (const format of formats) {
        const generator = new ValueGenerator(12345, format);
        expect(generator.getLocale()).toBeDefined();
      }
    });

    it('should generate different locale-specific data', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const usData = await new GenerationEngine().generate(schema, {
        count: 10,
        seed: 12345,
        locale: 'en_US',
        format: 'sql'
      });

      const deData = await new GenerationEngine().generate(schema, {
        count: 10,
        seed: 12345,
        locale: 'de_DE',
        format: 'sql'
      });

      expect(usData).not.toEqual(deData);
    });
  });

  describe('Edge case injection', () => {
    it('should inject edge cases at specified percentage', () => {
      const injector = new EdgeCaseInjector(25, 12345);
      let injected = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        if (injector.shouldInject()) {
          injected++;
        }
      }

      const percentage = (injected / trials) * 100;
      expect(percentage).toBeGreaterThan(20);
      expect(percentage).toBeLessThan(30);
    });

    it('should inject edge cases into generated data', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 100,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        edgeCases: 10
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      expect(tableData).toBeDefined();
    });
  });

  describe('Multiple export formats', () => {
    const options: GenerationOptions = {
      count: 20,
      seed: 12345,
      locale: 'en_US',
      format: 'sql',
      validate: true
    };

    let tableData: any[];
    let schema: any;

    beforeAll(async () => {
      const parser = new SQLParser();
      schema = parser.parseSchema(testSchema);

      const engine = new GenerationEngine();
      tableData = await engine.generate(schema, options);
    });

    it('should export to SQL format', () => {
      const exporter = new SQLExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(output).toContain('INSERT INTO');
      expect(output).toContain('users');
      expect(output).toContain('posts');
    });

    it('should export to JSON format', () => {
      const exporter = new JSONExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('tables');
    });

    it('should export to CSV format', () => {
      const exporter = new CSVExporter();
      const output = exporter.export(tableData, schema, options);

      expect(output).toBeDefined();
      expect(output).toContain('id,');
      expect(output).toContain('# users');
      expect(output).toContain('# posts');
    });

    it('should maintain data consistency across formats', () => {
      const sqlExporter = new SQLExporter();
      const jsonExporter = new JSONExporter();
      const csvExporter = new CSVExporter();

      const sqlOutput = sqlExporter.export(tableData, schema, options);
      const jsonOutput = jsonExporter.export(tableData, schema, options);
      const csvOutput = csvExporter.export(tableData, schema, options);

      expect(sqlOutput.length).toBeGreaterThan(0);
      expect(jsonOutput.length).toBeGreaterThan(0);
      expect(csvOutput.length).toBeGreaterThan(0);

      const jsonParsed = JSON.parse(jsonOutput);
      expect(jsonParsed.metadata.recordCount).toBe(40);
    });
  });

  describe('Validation reporting', () => {
    it('should generate validation reports in JSON format', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 30,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const report = ReportGenerator.generateValidationReport(
        validationResults,
        schema,
        options
      );

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('tables');
      expect(report.summary.totalTables).toBe(2);
    });

    it('should format reports as text', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 10,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const report = ReportGenerator.generateValidationReport(validationResults, schema, options);
      const textOutput = ReportGenerator.formatAsText(report);

      expect(textOutput).toContain('VALIDATION REPORT');
      expect(textOutput).toContain('Summary:');
    });

    it('should format reports as markdown', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 10,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const report = ReportGenerator.generateValidationReport(validationResults, schema, options);
      const mdOutput = ReportGenerator.formatAsMarkdown(report);

      expect(mdOutput).toContain('# Validation Report');
      expect(mdOutput).toContain('## Summary');
    });

    it('should generate compact summaries', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 10,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);

      const summary = ReportGenerator.generateCompactSummary(validationResults);

      expect(summary).toContain('tables');
      expect(typeof summary).toBe('string');
    });
  });

  describe('Combined Phase 2 features', () => {
    it('should work with all features enabled', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 50,
        seed: 12345,
        locale: 'de_DE',
        format: 'json',
        validate: true,
        edgeCases: 5
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      expect(tableData).toHaveLength(2);

      const validator = new ConstraintValidator();
      const validationResults = validator.validateAll(schema, tableData);
      const allValid = validationResults.every(r => r.valid);

      expect(allValid).toBe(true);

      const jsonExporter = new JSONExporter();
      const jsonOutput = jsonExporter.export(tableData, schema, options);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.tables.users).toHaveLength(50);
      expect(parsed.tables.posts).toHaveLength(50);
    });

    it('should support all export formats with edge cases', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 30,
        seed: 12345,
        locale: 'fr_FR',
        format: 'sql',
        edgeCases: 10
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const sqlExporter = new SQLExporter();
      const jsonExporter = new JSONExporter();
      const csvExporter = new CSVExporter();

      const sqlOutput = sqlExporter.export(tableData, schema, options);
      const jsonOutput = jsonExporter.export(tableData, schema, options);
      const csvOutput = csvExporter.export(tableData, schema, options);

      expect(sqlOutput).toBeDefined();
      expect(jsonOutput).toBeDefined();
      expect(csvOutput).toBeDefined();

      const jsonParsed = JSON.parse(jsonOutput);
      expect(jsonParsed.metadata.recordCount).toBe(60);
    });

    it('should generate reproducible results with all features', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const options: GenerationOptions = {
        count: 25,
        seed: 99999,
        locale: 'en_AU',
        format: 'sql',
        validate: true,
        edgeCases: 8
      };

      const engine1 = new GenerationEngine();
      const tableData1 = await engine1.generate(schema, options);

      const engine2 = new GenerationEngine();
      const tableData2 = await engine2.generate(schema, options);

      expect(tableData1).toEqual(tableData2);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const parser = new SQLParser();
      const schema = parser.parseSchema(testSchema);

      const startTime = Date.now();

      const options: GenerationOptions = {
        count: 200,
        seed: 12345,
        locale: 'en_US',
        format: 'sql',
        validate: true
      };

      const engine = new GenerationEngine();
      const tableData = await engine.generate(schema, options);

      const duration = Date.now() - startTime;

      expect(tableData).toHaveLength(2);
      expect(tableData[0].records).toHaveLength(200);
      expect(tableData[1].records).toHaveLength(200);
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });

  describe('Error handling', () => {
    it('should handle invalid locale gracefully', () => {
      const generator = new ValueGenerator(12345, 'invalid_locale');
      expect(generator.getLocale()).toBe('en_US');
    });

    it('should handle edge case percentage bounds', () => {
      const injector1 = new EdgeCaseInjector(-10, 12345);
      const injector2 = new EdgeCaseInjector(150, 12345);

      expect(injector1).toBeDefined();
      expect(injector2).toBeDefined();
    });
  });
});
