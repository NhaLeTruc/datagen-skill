import { CustomPatternGenerator, PatternLibrary } from '../../src/core/generator/custom-pattern-generator';

describe('CustomPatternGenerator', () => {
  describe('pattern generation', () => {
    it('should generate digits', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('####', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^\d{4}$/);
      });
    });

    it('should generate letters', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('XXXX', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^[A-Z]{4}$/);
      });
    });

    it('should generate alphanumeric', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('AAAA', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^[A-Z0-9]{4}$/);
      });
    });

    it('should generate hex', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('HHHH', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^[0-9A-F]{4}$/);
      });
    });

    it('should handle mixed patterns', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('ABC-####', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^ABC-\d{4}$/);
      });
    });

    it('should handle literals', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('ORDER-####', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toMatch(/^ORDER-\d{4}$/);
      });
    });

    it('should handle escaped characters', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('\\#\\#\\#', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('###');
      });
    });

    it('should handle options', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('[Red,Green,Blue]-###', 10);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toMatch(/^(Red|Green|Blue)-\d{3}$/);
      });
    });

    it('should handle custom count syntax', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generate('{d:6}', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toMatch(/^\d{6}$/);
      });
    });
  });

  describe('reproducibility', () => {
    it('should generate same results with same seed', () => {
      const gen1 = new CustomPatternGenerator(12345);
      const gen2 = new CustomPatternGenerator(12345);

      const results1 = gen1.generate('####-XX', 10);
      const results2 = gen2.generate('####-XX', 10);

      expect(results1).toEqual(results2);
    });

    it('should generate different results with different seeds', () => {
      const gen1 = new CustomPatternGenerator(12345);
      const gen2 = new CustomPatternGenerator(54321);

      const results1 = gen1.generate('####', 10);
      const results2 = gen2.generate('####', 10);

      expect(results1).not.toEqual(results2);
    });
  });

  describe('pattern validation', () => {
    it('should validate correct patterns', () => {
      const result = CustomPatternGenerator.validatePattern('ABC-####-XX');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unclosed braces', () => {
      const result = CustomPatternGenerator.validatePattern('{d:4');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unclosed brackets', () => {
      const result = CustomPatternGenerator.validatePattern('[Red,Green');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect trailing backslash', () => {
      const result = CustomPatternGenerator.validatePattern('ABC\\');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('sequential generation', () => {
    it('should generate sequential values', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generateSequential('###', 1, 5);

      expect(results).toHaveLength(5);
      expect(results[0]).toContain('001');
      expect(results[1]).toContain('002');
      expect(results[4]).toContain('005');
    });
  });

  describe('prefix and suffix', () => {
    it('should add prefix', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generateWithPrefix('PRE-', '###', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toMatch(/^PRE-\d{3}$/);
      });
    });

    it('should add suffix', () => {
      const generator = new CustomPatternGenerator(12345);
      const results = generator.generateWithSuffix('###', '-SUF', 5);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toMatch(/^\d{3}-SUF$/);
      });
    });
  });
});

describe('PatternLibrary', () => {
  it('should load default patterns', () => {
    const library = new PatternLibrary();
    const patterns = library.listPatterns();

    expect(patterns.length).toBeGreaterThan(0);
    expect(library.hasPattern('sku')).toBe(true);
  });

  it('should add custom pattern', () => {
    const library = new PatternLibrary();
    library.addPattern('custom', 'CUS-####');

    expect(library.hasPattern('custom')).toBe(true);
    expect(library.getPattern('custom')).toBe('CUS-####');
  });

  it('should remove pattern', () => {
    const library = new PatternLibrary();
    library.addPattern('temp', 'TMP-###');

    expect(library.hasPattern('temp')).toBe(true);

    library.removePattern('temp');
    expect(library.hasPattern('temp')).toBe(false);
  });
});
