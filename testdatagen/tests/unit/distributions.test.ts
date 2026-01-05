import { ZipfDistribution } from '../../src/core/generator/distributions/zipf';
import { NormalDistribution } from '../../src/core/generator/distributions/normal';

describe('ZipfDistribution', () => {
  describe('constructor', () => {
    it('should create with default parameters', () => {
      const zipf = new ZipfDistribution();
      expect(zipf).toBeDefined();
    });

    it('should create with custom parameters', () => {
      const zipf = new ZipfDistribution({ a: 2.5, seed: 12345, usePython: false });
      expect(zipf).toBeDefined();
    });
  });

  describe('generate (JavaScript fallback)', () => {
    it('should generate correct number of values', async () => {
      const zipf = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const values = await zipf.generate(100);

      expect(values).toHaveLength(100);
    });

    it('should generate positive integers', async () => {
      const zipf = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const values = await zipf.generate(100);

      expect(values.every(v => typeof v === 'number')).toBe(true);
      expect(values.every(v => v > 0)).toBe(true);
      expect(values.every(v => Number.isInteger(v))).toBe(true);
    });

    it('should be reproducible with seed', async () => {
      const zipf1 = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const zipf2 = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });

      const values1 = await zipf1.generate(50);
      const values2 = await zipf2.generate(50);

      expect(values1).toEqual(values2);
    });

    it('should produce different values with different seeds', async () => {
      const zipf1 = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const zipf2 = new ZipfDistribution({ a: 1.5, seed: 54321, usePython: false });

      const values1 = await zipf1.generate(50);
      const values2 = await zipf2.generate(50);

      expect(values1).not.toEqual(values2);
    });

    it('should show Zipf distribution characteristics', async () => {
      const zipf = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const values = await zipf.generate(1000);

      const frequency: Record<number, number> = {};
      for (const v of values) {
        frequency[v] = (frequency[v] || 0) + 1;
      }

      const sortedCounts = Object.values(frequency).sort((a, b) => b - a);

      expect(sortedCounts[0]).toBeGreaterThan(sortedCounts[sortedCounts.length - 1]);
    });

    it('should have lower mean with higher a parameter', async () => {
      const zipf1 = new ZipfDistribution({ a: 1.5, seed: 12345, usePython: false });
      const zipf2 = new ZipfDistribution({ a: 2.5, seed: 12345, usePython: false });

      const values1 = await zipf1.generate(1000);
      const values2 = await zipf2.generate(1000);

      const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
      const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

      expect(mean1).toBeGreaterThan(mean2);
    });
  });
});

describe('NormalDistribution', () => {
  describe('constructor', () => {
    it('should create with default parameters', () => {
      const normal = new NormalDistribution();
      expect(normal).toBeDefined();
    });

    it('should create with custom parameters', () => {
      const normal = new NormalDistribution({ mean: 50, std: 10, seed: 12345, usePython: false });
      expect(normal).toBeDefined();
    });

    it('should throw error for zero or negative std', () => {
      expect(() => new NormalDistribution({ std: 0 })).toThrow();
      expect(() => new NormalDistribution({ std: -1 })).toThrow();
    });
  });

  describe('generate (JavaScript fallback)', () => {
    it('should generate correct number of values', async () => {
      const normal = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const values = await normal.generate(100);

      expect(values).toHaveLength(100);
    });

    it('should generate numeric values', async () => {
      const normal = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const values = await normal.generate(100);

      expect(values.every(v => typeof v === 'number')).toBe(true);
      expect(values.every(v => !isNaN(v))).toBe(true);
      expect(values.every(v => isFinite(v))).toBe(true);
    });

    it('should be reproducible with seed', async () => {
      const normal1 = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const normal2 = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });

      const values1 = await normal1.generate(50);
      const values2 = await normal2.generate(50);

      expect(values1).toEqual(values2);
    });

    it('should produce different values with different seeds', async () => {
      const normal1 = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const normal2 = new NormalDistribution({ mean: 0, std: 1, seed: 54321, usePython: false });

      const values1 = await normal1.generate(50);
      const values2 = await normal2.generate(50);

      expect(values1).not.toEqual(values2);
    });

    it('should generate values around specified mean', async () => {
      const normal = new NormalDistribution({ mean: 50, std: 5, seed: 12345, usePython: false });
      const values = await normal.generate(1000);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      expect(mean).toBeGreaterThan(45);
      expect(mean).toBeLessThan(55);
    });

    it('should generate values with approximately correct std', async () => {
      const normal = new NormalDistribution({ mean: 0, std: 10, seed: 12345, usePython: false });
      const values = await normal.generate(10000);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      expect(std).toBeGreaterThan(9);
      expect(std).toBeLessThan(11);
    });

    it('should follow bell curve distribution', async () => {
      const normal = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const values = await normal.generate(10000);

      const withinOneSigma = values.filter(v => Math.abs(v) <= 1).length;
      const withinTwoSigma = values.filter(v => Math.abs(v) <= 2).length;

      const percentOneSigma = (withinOneSigma / values.length) * 100;
      const percentTwoSigma = (withinTwoSigma / values.length) * 100;

      expect(percentOneSigma).toBeGreaterThan(65);
      expect(percentOneSigma).toBeLessThan(70);

      expect(percentTwoSigma).toBeGreaterThan(93);
      expect(percentTwoSigma).toBeLessThan(97);
    });

    it('should handle different mean values', async () => {
      const normal1 = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const normal2 = new NormalDistribution({ mean: 100, std: 1, seed: 12345, usePython: false });

      const values1 = await normal1.generate(1000);
      const values2 = await normal2.generate(1000);

      const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
      const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

      expect(Math.abs(mean2 - mean1)).toBeGreaterThan(95);
    });

    it('should handle different std values', async () => {
      const normal1 = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const normal2 = new NormalDistribution({ mean: 0, std: 10, seed: 12345, usePython: false });

      const values1 = await normal1.generate(1000);
      const values2 = await normal2.generate(1000);

      const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
      const variance1 = values1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0) / values1.length;

      const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
      const variance2 = values2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0) / values2.length;

      expect(variance2).toBeGreaterThan(variance1 * 50);
    });
  });

  describe('Box-Muller implementation', () => {
    it('should generate pairs of independent normal values', async () => {
      const normal = new NormalDistribution({ mean: 0, std: 1, seed: 12345, usePython: false });
      const values = await normal.generate(2000);

      const firstHalf = values.slice(0, 1000);
      const secondHalf = values.slice(1000);

      const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      expect(Math.abs(mean1 - mean2)).toBeLessThan(0.2);
    });
  });
});
