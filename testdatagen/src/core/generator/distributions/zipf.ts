import { pythonBridge } from '../../../utils/python-bridge';

export interface ZipfOptions {
  a?: number;
  seed?: number;
  usePython?: boolean;
}

export class ZipfDistribution {
  private a: number;
  private seed?: number;
  private usePython: boolean;

  constructor(options: ZipfOptions = {}) {
    this.a = options.a || 1.5;
    this.seed = options.seed;
    this.usePython = options.usePython !== false;
  }

  /**
   * Generate n values following Zipf distribution
   */
  public async generate(n: number): Promise<number[]> {
    if (this.usePython) {
      try {
        return await pythonBridge.generateZipf(n, this.a, this.seed);
      } catch (error) {
        console.warn('Python bridge failed, falling back to JavaScript implementation');
        return this.generateJS(n);
      }
    }

    return this.generateJS(n);
  }

  /**
   * JavaScript fallback implementation of Zipf distribution
   * Uses inverse transform sampling
   */
  private generateJS(n: number): number[] {
    const values: number[] = [];
    const maxValue = 1000;

    const harmonic = this.harmonicNumber(maxValue, this.a);
    const probabilities = this.computeProbabilities(maxValue, harmonic);
    const cumulativeProbabilities = this.computeCumulative(probabilities);

    if (this.seed !== undefined) {
      this.seedRandom(this.seed);
    }

    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const value = this.inverseCDF(u, cumulativeProbabilities);
      values.push(value);
    }

    return values;
  }

  /**
   * Compute generalized harmonic number H(n, a)
   */
  private harmonicNumber(n: number, a: number): number {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
      sum += 1 / Math.pow(i, a);
    }
    return sum;
  }

  /**
   * Compute probability mass function for Zipf distribution
   */
  private computeProbabilities(n: number, harmonic: number): number[] {
    const probabilities: number[] = [];
    for (let i = 1; i <= n; i++) {
      probabilities.push((1 / Math.pow(i, this.a)) / harmonic);
    }
    return probabilities;
  }

  /**
   * Compute cumulative distribution function
   */
  private computeCumulative(probabilities: number[]): number[] {
    const cumulative: number[] = [];
    let sum = 0;
    for (const p of probabilities) {
      sum += p;
      cumulative.push(sum);
    }
    return cumulative;
  }

  /**
   * Inverse CDF for sampling
   */
  private inverseCDF(u: number, cumulativeProbabilities: number[]): number {
    for (let i = 0; i < cumulativeProbabilities.length; i++) {
      if (u <= cumulativeProbabilities[i]) {
        return i + 1;
      }
    }
    return cumulativeProbabilities.length;
  }

  /**
   * Seed the random number generator (simple implementation)
   */
  private seedRandom(seed: number): void {
    let currentSeed = seed;
    Math.random = () => {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Check if Python is available
   */
  public static async checkPythonAvailable(): Promise<boolean> {
    return await pythonBridge.checkAvailability();
  }

  /**
   * Get distribution parameters
   */
  public getParameters(): { a: number; seed?: number } {
    return {
      a: this.a,
      seed: this.seed
    };
  }

  /**
   * Map Zipf values to a range (for foreign key selection)
   */
  public mapToRange(values: number[], min: number, max: number): number[] {
    const range = max - min + 1;
    return values.map(v => {
      const normalized = ((v - 1) % range) + min;
      return Math.floor(normalized);
    });
  }
}
