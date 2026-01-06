import { StatisticalValidator } from '../../src/core/validator/statistical-validator';

describe('StatisticalValidator', () => {
  let validator: StatisticalValidator;

  beforeEach(() => {
    validator = new StatisticalValidator();
  });

  describe('Chi-squared test', () => {
    it('passes for uniform distribution', () => {
      // Generate perfectly uniform distribution
      const observed = Array(10).fill(100); // Each category has exactly 100 observations
      const expected = Array(10).fill(100);

      const result = validator.chiSquaredTest(observed, expected);

      expect(result.passed).toBe(true);
      expect(result.pValue).toBeGreaterThan(0.05);
      expect(result.chiSquaredStatistic).toBeCloseTo(0, 1);
    });

    it('fails for significantly different distribution', () => {
      // Observed vs expected are very different
      const observed = [500, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      const expected = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];

      const result = validator.chiSquaredTest(observed, expected);

      expect(result.passed).toBe(false);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.chiSquaredStatistic).toBeGreaterThan(0);
    });

    it('validates Zipf distribution', () => {
      // Simulate Zipf distribution with parameter s=1.5
      const categories = 10;
      const totalSamples = 10000;

      // Generate expected Zipf distribution
      const expected: number[] = [];
      let sum = 0;
      for (let k = 1; k <= categories; k++) {
        sum += 1 / Math.pow(k, 1.5);
      }

      for (let k = 1; k <= categories; k++) {
        const probability = (1 / Math.pow(k, 1.5)) / sum;
        expected.push(Math.round(probability * totalSamples));
      }

      // Simulate observed data that roughly follows Zipf
      const observed = expected.map(e => {
        // Add small random variation
        return Math.round(e + (Math.random() - 0.5) * e * 0.1);
      });

      const result = validator.chiSquaredTest(observed, expected);

      expect(result.passed).toBe(true);
      expect(result.pValue).toBeGreaterThan(0.05);
    });

    it('calculates degrees of freedom correctly', () => {
      const observed = [50, 60, 70, 80];
      const expected = [65, 65, 65, 65];

      const result = validator.chiSquaredTest(observed, expected);

      expect(result.degreesOfFreedom).toBe(3); // n - 1
    });
  });

  describe('Kolmogorov-Smirnov test', () => {
    it('passes for normal distribution', () => {
      // Generate approximately normal distribution
      const data: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        // Box-Muller transform for normal distribution
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        data.push(z);
      }

      const result = validator.kolmogorovSmirnovTest(data, 'normal');

      expect(result.passed).toBe(true);
      expect(result.pValue).toBeGreaterThan(0.05);
    });

    it('fails for non-normal distribution when testing for normality', () => {
      // Generate uniform distribution
      const data = Array.from({ length: 1000 }, () => Math.random() * 100);

      const result = validator.kolmogorovSmirnovTest(data, 'normal');

      expect(result.passed).toBe(false);
      expect(result.pValue).toBeLessThan(0.05);
    });

    it('validates uniform distribution', () => {
      // Generate uniform distribution
      const data = Array.from({ length: 1000 }, () => Math.random());

      const result = validator.kolmogorovSmirnovTest(data, 'uniform');

      expect(result.passed).toBe(true);
      expect(result.pValue).toBeGreaterThan(0.05);
    });

    it('validates exponential distribution', () => {
      // Generate exponential distribution with lambda=1
      const data = Array.from({ length: 1000 }, () => -Math.log(1 - Math.random()));

      const result = validator.kolmogorovSmirnovTest(data, 'exponential');

      expect(result.passed).toBe(true);
      expect(result.pValue).toBeGreaterThan(0.05);
    });

    it('calculates KS statistic correctly', () => {
      const data = [1, 2, 3, 4, 5];

      const result = validator.kolmogorovSmirnovTest(data, 'uniform');

      expect(result.ksStatistic).toBeGreaterThanOrEqual(0);
      expect(result.ksStatistic).toBeLessThanOrEqual(1);
    });
  });

  describe('distribution detection', () => {
    it('detects normal distribution', () => {
      // Generate normal distribution
      const data: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        data.push(z * 10 + 50); // mean=50, std=10
      }

      const detected = validator.detectDistribution(data);

      expect(detected).toBe('normal');
    });

    it('detects uniform distribution', () => {
      const data = Array.from({ length: 1000 }, () => Math.random() * 100);

      const detected = validator.detectDistribution(data);

      expect(detected).toBe('uniform');
    });

    it('detects Zipf distribution', () => {
      // Generate Zipf-like distribution
      const data: number[] = [];
      const s = 1.5;
      const n = 100;

      // Calculate normalization constant
      let sum = 0;
      for (let k = 1; k <= n; k++) {
        sum += 1 / Math.pow(k, s);
      }

      // Generate samples
      for (let i = 0; i < 10000; i++) {
        const rand = Math.random();
        let cumulative = 0;

        for (let k = 1; k <= n; k++) {
          cumulative += (1 / Math.pow(k, s)) / sum;
          if (rand <= cumulative) {
            data.push(k);
            break;
          }
        }
      }

      const detected = validator.detectDistribution(data);

      expect(['zipf', 'power-law', 'exponential']).toContain(detected);
    });

    it('detects exponential distribution', () => {
      const data = Array.from({ length: 1000 }, () => -Math.log(1 - Math.random()) * 5);

      const detected = validator.detectDistribution(data);

      expect(detected).toBe('exponential');
    });
  });

  describe('statistical measures', () => {
    it('calculates mean correctly', () => {
      const data = [1, 2, 3, 4, 5];

      const mean = validator.calculateMean(data);

      expect(mean).toBe(3);
    });

    it('calculates median correctly for odd length', () => {
      const data = [1, 3, 5, 7, 9];

      const median = validator.calculateMedian(data);

      expect(median).toBe(5);
    });

    it('calculates median correctly for even length', () => {
      const data = [1, 2, 3, 4];

      const median = validator.calculateMedian(data);

      expect(median).toBe(2.5);
    });

    it('calculates standard deviation correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];

      const stdDev = validator.calculateStdDev(data);

      expect(stdDev).toBeCloseTo(2, 0);
    });

    it('calculates variance correctly', () => {
      const data = [1, 2, 3, 4, 5];

      const variance = validator.calculateVariance(data);

      expect(variance).toBeCloseTo(2, 0);
    });

    it('calculates skewness for symmetric distribution', () => {
      // Symmetric distribution should have skewness near 0
      const data = [1, 2, 3, 4, 5, 4, 3, 2, 1];

      const skewness = validator.calculateSkewness(data);

      expect(Math.abs(skewness)).toBeLessThan(0.5);
    });

    it('calculates positive skewness for right-skewed distribution', () => {
      // Right-skewed distribution
      const data = [1, 1, 1, 2, 2, 3, 5, 10];

      const skewness = validator.calculateSkewness(data);

      expect(skewness).toBeGreaterThan(0);
    });

    it('calculates kurtosis correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const kurtosis = validator.calculateKurtosis(data);

      expect(kurtosis).toBeDefined();
      expect(typeof kurtosis).toBe('number');
    });
  });

  describe('cardinality validation', () => {
    it('validates expected cardinality', () => {
      const data = [1, 1, 2, 2, 3, 3, 4, 4]; // 4 unique values

      const result = validator.validateCardinality(data, 4);

      expect(result.passed).toBe(true);
      expect(result.actualCardinality).toBe(4);
      expect(result.expectedCardinality).toBe(4);
    });

    it('detects incorrect cardinality', () => {
      const data = [1, 1, 2, 2, 3, 3]; // 3 unique values

      const result = validator.validateCardinality(data, 5);

      expect(result.passed).toBe(false);
      expect(result.actualCardinality).toBe(3);
      expect(result.expectedCardinality).toBe(5);
    });

    it('allows cardinality tolerance', () => {
      const data = Array.from({ length: 100 }, (_, i) => i % 10); // ~10 unique values

      const result = validator.validateCardinality(data, 10, 0.1); // 10% tolerance

      expect(result.passed).toBe(true);
    });
  });

  describe('correlation tests', () => {
    it('detects strong positive correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // y = 2x

      const correlation = validator.calculateCorrelation(x, y);

      expect(correlation).toBeCloseTo(1, 1);
    });

    it('detects strong negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2]; // negative correlation

      const correlation = validator.calculateCorrelation(x, y);

      expect(correlation).toBeCloseTo(-1, 1);
    });

    it('detects no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 1, 4, 2, 5]; // random

      const correlation = validator.calculateCorrelation(x, y);

      expect(Math.abs(correlation)).toBeLessThan(0.5);
    });
  });

  describe('outlier detection', () => {
    it('detects outliers using IQR method', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is outlier

      const outliers = validator.detectOutliers(data);

      expect(outliers).toContain(100);
      expect(outliers.length).toBeGreaterThan(0);
    });

    it('detects no outliers in normal data', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const outliers = validator.detectOutliers(data);

      expect(outliers).toHaveLength(0);
    });

    it('uses Z-score method for outlier detection', () => {
      const data = [10, 12, 13, 11, 12, 13, 14, 12, 11, 100]; // 100 is outlier

      const outliers = validator.detectOutliersZScore(data, 3);

      expect(outliers).toContain(100);
    });
  });

  describe('goodness of fit tests', () => {
    it('validates data fits expected distribution', () => {
      // Generate normal data
      const data: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        data.push(z);
      }

      const result = validator.goodnessOfFitTest(data, 'normal');

      expect(result.passed).toBe(true);
      expect(result.testType).toBe('Kolmogorov-Smirnov');
    });

    it('provides meaningful error messages on failure', () => {
      const data = [1, 2, 3]; // Too little data

      const result = validator.goodnessOfFitTest(data, 'normal');

      expect(result.passed).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('entropy calculation', () => {
    it('calculates entropy for uniform distribution', () => {
      const data = [1, 1, 2, 2, 3, 3, 4, 4]; // Perfectly balanced

      const entropy = validator.calculateEntropy(data);

      // Maximum entropy for 4 categories
      expect(entropy).toBeCloseTo(Math.log2(4), 1);
    });

    it('calculates low entropy for skewed distribution', () => {
      const data = [1, 1, 1, 1, 1, 1, 2, 3]; // Heavily skewed

      const entropy = validator.calculateEntropy(data);

      expect(entropy).toBeLessThan(2); // Low entropy
    });
  });

  describe('frequency analysis', () => {
    it('generates frequency distribution', () => {
      const data = [1, 1, 2, 2, 2, 3, 4, 4, 4, 4];

      const frequencies = validator.getFrequencyDistribution(data);

      expect(frequencies[1]).toBe(2);
      expect(frequencies[2]).toBe(3);
      expect(frequencies[3]).toBe(1);
      expect(frequencies[4]).toBe(4);
    });

    it('validates frequency distribution matches expected', () => {
      const data = Array.from({ length: 100 }, (_, i) => i % 10);
      const expected = { 0: 10, 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 10, 9: 10 };

      const result = validator.validateFrequencyDistribution(data, expected);

      expect(result.passed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      const data: number[] = [];

      expect(() => validator.calculateMean(data)).toThrow();
    });

    it('handles single element array', () => {
      const data = [42];

      const mean = validator.calculateMean(data);
      const median = validator.calculateMedian(data);

      expect(mean).toBe(42);
      expect(median).toBe(42);
    });

    it('handles all same values', () => {
      const data = [5, 5, 5, 5, 5];

      const stdDev = validator.calculateStdDev(data);
      const variance = validator.calculateVariance(data);

      expect(stdDev).toBe(0);
      expect(variance).toBe(0);
    });
  });

  describe('integration with Python scipy', () => {
    it('can delegate to Python for advanced statistical tests', async () => {
      const data = Array.from({ length: 1000 }, () => Math.random());

      const result = await validator.pythonChiSquaredTest(data, 'uniform');

      expect(result).toBeDefined();
      expect(result.pValue).toBeDefined();
    }, 10000); // Longer timeout for subprocess

    it('falls back to JS implementation if Python unavailable', async () => {
      const data = [1, 2, 3, 4, 5];

      const result = await validator.chiSquaredTestWithFallback(data, [1, 1, 1, 1, 1]);

      expect(result).toBeDefined();
      expect(result.chiSquaredStatistic).toBeDefined();
    });
  });
});
