import { PythonBridge } from '../../src/utils/python-bridge';
import * as path from 'path';

describe('PythonBridge', () => {
  let bridge: PythonBridge;

  beforeEach(() => {
    const pythonDir = path.join(__dirname, '../../python');
    bridge = new PythonBridge(pythonDir);
  });

  describe('generateZipf', () => {
    it('should generate Zipf-distributed values', async () => {
      const values = await bridge.generateZipf(100, 1.5);

      expect(values).toHaveLength(100);
      expect(values.every(v => typeof v === 'number')).toBe(true);
      expect(values.every(v => v > 0)).toBe(true);
    });

    it('should generate Zipf values with seed for reproducibility', async () => {
      const values1 = await bridge.generateZipf(50, 1.5, 12345);
      const values2 = await bridge.generateZipf(50, 1.5, 12345);

      expect(values1).toEqual(values2);
    });

    it('should generate different values with different seeds', async () => {
      const values1 = await bridge.generateZipf(50, 1.5, 12345);
      const values2 = await bridge.generateZipf(50, 1.5, 54321);

      expect(values1).not.toEqual(values2);
    });

    it('should generate Zipf values with different a parameters', async () => {
      const values1 = await bridge.generateZipf(100, 1.5);
      const values2 = await bridge.generateZipf(100, 2.5);

      const avg1 = values1.reduce((a, b) => a + b, 0) / values1.length;
      const avg2 = values2.reduce((a, b) => a + b, 0) / values2.length;

      expect(avg1).toBeGreaterThan(avg2);
    });

    it('should throw error for invalid parameters', async () => {
      await expect(bridge.generateZipf(0, 1.5)).rejects.toThrow();
    });
  });

  describe('generateNormal', () => {
    it('should generate normally distributed values', async () => {
      const values = await bridge.generateNormal(100, 0, 1);

      expect(values).toHaveLength(100);
      expect(values.every(v => typeof v === 'number')).toBe(true);
    });

    it('should generate normal values with seed for reproducibility', async () => {
      const values1 = await bridge.generateNormal(50, 0, 1, 12345);
      const values2 = await bridge.generateNormal(50, 0, 1, 12345);

      expect(values1).toEqual(values2);
    });

    it('should generate values around specified mean', async () => {
      const values = await bridge.generateNormal(1000, 50, 5, 12345);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      expect(mean).toBeGreaterThan(45);
      expect(mean).toBeLessThan(55);
    });

    it('should generate values with specified standard deviation', async () => {
      const values = await bridge.generateNormal(1000, 0, 10, 12345);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);

      expect(std).toBeGreaterThan(8);
      expect(std).toBeLessThan(12);
    });

    it('should throw error for zero or negative std', async () => {
      await expect(bridge.generateNormal(100, 0, 0)).rejects.toThrow();
      await expect(bridge.generateNormal(100, 0, -1)).rejects.toThrow();
    });
  });

  describe('chiSquaredTest', () => {
    it('should perform chi-squared test', async () => {
      const observed = [10, 20, 30, 40];
      const expected = [15, 15, 35, 35];

      const result = await bridge.chiSquaredTest(observed, expected);

      expect(result).toHaveProperty('statistic');
      expect(result).toHaveProperty('pvalue');
      expect(typeof result.statistic).toBe('number');
      expect(typeof result.pvalue).toBe('number');
      expect(result.pvalue).toBeGreaterThanOrEqual(0);
      expect(result.pvalue).toBeLessThanOrEqual(1);
    });

    it('should reject null hypothesis for very different distributions', async () => {
      const observed = [100, 0, 0, 0];
      const expected = [25, 25, 25, 25];

      const result = await bridge.chiSquaredTest(observed, expected);

      expect(result.pvalue).toBeLessThan(0.05);
    });

    it('should not reject null hypothesis for similar distributions', async () => {
      const observed = [24, 26, 25, 25];
      const expected = [25, 25, 25, 25];

      const result = await bridge.chiSquaredTest(observed, expected);

      expect(result.pvalue).toBeGreaterThan(0.05);
    });
  });

  describe('ksTest', () => {
    it('should perform KS test for normal distribution', async () => {
      const values = await bridge.generateNormal(100, 0, 1, 12345);

      const result = await bridge.ksTest(values, 'norm');

      expect(result).toHaveProperty('statistic');
      expect(result).toHaveProperty('pvalue');
      expect(typeof result.statistic).toBe('number');
      expect(typeof result.pvalue).toBe('number');
      expect(result.pvalue).toBeGreaterThanOrEqual(0);
      expect(result.pvalue).toBeLessThanOrEqual(1);
    });

    it('should not reject normal distribution for normally generated data', async () => {
      const values = await bridge.generateNormal(1000, 0, 1, 12345);

      const result = await bridge.ksTest(values, 'norm');

      expect(result.pvalue).toBeGreaterThan(0.05);
    });

    it('should reject normal distribution for uniform data', async () => {
      const values = Array.from({ length: 100 }, (_, i) => i);

      const result = await bridge.ksTest(values, 'norm');

      expect(result.pvalue).toBeLessThan(0.05);
    });
  });

  describe('checkDependencies', () => {
    it('should check Python dependencies', async () => {
      const available = await bridge.checkDependencies();

      expect(typeof available).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent Python script', async () => {
      const badBridge = new PythonBridge('/nonexistent/path');

      await expect(badBridge.generateZipf(100, 1.5)).rejects.toThrow();
    });

    it('should handle invalid JSON response', async () => {
      await expect(async () => {
        await bridge.generateNormal(-1, 0, 1);
      }).rejects.toThrow();
    });
  });
});
