import { pythonBridge } from '../../../utils/python-bridge';

export interface NormalOptions {
  mean?: number;
  std?: number;
  seed?: number;
  usePython?: boolean;
}

export class NormalDistribution {
  private mean: number;
  private std: number;
  private seed?: number;
  private usePython: boolean;

  constructor(options: NormalOptions = {}) {
    this.mean = options.mean !== undefined ? options.mean : 0;
    this.std = options.std !== undefined ? options.std : 1;
    this.seed = options.seed;
    this.usePython = options.usePython !== false;

    if (this.std <= 0) {
      throw new Error('Standard deviation must be positive');
    }
  }

  /**
   * Generate n values following Normal distribution
   */
  public async generate(n: number): Promise<number[]> {
    if (this.usePython) {
      try {
        return await pythonBridge.generateNormal(n, this.mean, this.std, this.seed);
      } catch (error) {
        console.warn('Python bridge failed, falling back to JavaScript implementation');
        return this.generateJS(n);
      }
    }

    return this.generateJS(n);
  }

  /**
   * JavaScript implementation using Box-Muller transform
   */
  private generateJS(n: number): number[] {
    const values: number[] = [];

    if (this.seed !== undefined) {
      this.seedRandom(this.seed);
    }

    for (let i = 0; i < n; i++) {
      values.push(this.boxMuller());
    }

    return values;
  }

  /**
   * Box-Muller transform for generating normally distributed values
   */
  private boxMuller(): number {
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return z0 * this.std + this.mean;
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
  public getParameters(): { mean: number; std: number; seed?: number } {
    return {
      mean: this.mean,
      std: this.std,
      seed: this.seed
    };
  }

  /**
   * Truncate values to a range (useful for constrained columns like age)
   */
  public truncate(values: number[], min: number, max: number): number[] {
    return values.map(v => {
      if (v < min) return min;
      if (v > max) return max;
      return v;
    });
  }

  /**
   * Round values to integers
   */
  public toIntegers(values: number[]): number[] {
    return values.map(v => Math.round(v));
  }

  /**
   * Ensure all values are positive
   */
  public toPositive(values: number[]): number[] {
    return values.map(v => Math.abs(v));
  }
}
