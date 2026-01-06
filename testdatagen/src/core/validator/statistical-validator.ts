import { spawn } from 'child_process';
import * as path from 'path';

export interface ChiSquaredResult {
  test: 'chi_squared';
  statistic: number;
  p_value: number;
  significant: boolean;
  degrees_of_freedom: number;
}

export interface KSTestResult {
  test: 'kolmogorov_smirnov';
  distribution: string;
  statistic: number;
  p_value: number;
  significant: boolean;
  sample_size: number;
}

export interface AndersonDarlingResult {
  test: 'anderson_darling';
  distribution: string;
  statistic: number;
  critical_values: Record<string, number>;
  rejected_at: number | null;
  significant: boolean;
  sample_size: number;
}

export interface ShapiroWilkResult {
  test: 'shapiro_wilk';
  statistic: number;
  p_value: number;
  significant: boolean;
  sample_size: number;
}

export interface UniformityTestResult {
  ks_test: KSTestResult;
  chi_squared_test: ChiSquaredResult;
  is_uniform: boolean;
}

export type StatisticalTestResult =
  | ChiSquaredResult
  | KSTestResult
  | AndersonDarlingResult
  | ShapiroWilkResult
  | UniformityTestResult;

export class StatisticalValidator {
  private pythonPath: string;
  private scriptPath: string;

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.scriptPath = path.join(__dirname, '../../../python/statistical_tests.py');
  }

  async chiSquaredTest(observed: number[], expected: number[]): Promise<ChiSquaredResult> {
    const args = [
      'chi_squared',
      JSON.stringify(observed),
      JSON.stringify(expected)
    ];

    const result = await this.runPythonScript(args);

    if (!result.success) {
      throw new Error(`Chi-squared test failed: ${result.error}`);
    }

    return result as ChiSquaredResult;
  }

  async ksTest(
    data: number[],
    distribution: 'norm' | 'uniform' | 'expon' = 'norm',
    params?: { mean?: number; std?: number; loc?: number; scale?: number }
  ): Promise<KSTestResult> {
    const args = [
      'ks_test',
      JSON.stringify(data),
      distribution
    ];

    if (params) {
      args.push(JSON.stringify(params));
    }

    const result = await this.runPythonScript(args);

    if (!result.success) {
      throw new Error(`K-S test failed: ${result.error}`);
    }

    return result as KSTestResult;
  }

  async andersonDarlingTest(
    data: number[],
    distribution: 'norm' | 'expon' | 'logistic' | 'gumbel' = 'norm'
  ): Promise<AndersonDarlingResult> {
    const args = [
      'anderson',
      JSON.stringify(data),
      distribution
    ];

    const result = await this.runPythonScript(args);

    if (!result.success) {
      throw new Error(`Anderson-Darling test failed: ${result.error}`);
    }

    return result as AndersonDarlingResult;
  }

  async shapiroWilkTest(data: number[]): Promise<ShapiroWilkResult> {
    const args = [
      'shapiro',
      JSON.stringify(data)
    ];

    const result = await this.runPythonScript(args);

    if (!result.success) {
      throw new Error(`Shapiro-Wilk test failed: ${result.error}`);
    }

    return result as ShapiroWilkResult;
  }

  async uniformityTest(data: number[]): Promise<UniformityTestResult> {
    const args = [
      'uniformity',
      JSON.stringify(data)
    ];

    const result = await this.runPythonScript(args);

    if (!result.success) {
      throw new Error(`Uniformity test failed: ${result.error}`);
    }

    return result as UniformityTestResult;
  }

  async validateDistribution(
    data: number[],
    expectedDistribution: 'normal' | 'uniform' | 'exponential',
    params?: any
  ): Promise<{
    distribution: string;
    passes: boolean;
    tests: StatisticalTestResult[];
    summary: string;
  }> {
    const tests: StatisticalTestResult[] = [];

    try {
      if (expectedDistribution === 'normal') {
        const ksResult = await this.ksTest(data, 'norm', params);
        tests.push(ksResult);

        if (data.length <= 5000) {
          const shapiroResult = await this.shapiroWilkTest(data);
          tests.push(shapiroResult);
        }

        const adResult = await this.andersonDarlingTest(data, 'norm');
        tests.push(adResult);

        const passes = tests.every(t => {
          if ('p_value' in t) {
            return t.p_value > 0.05;
          }
          if ('rejected_at' in t) {
            return t.rejected_at === null;
          }
          return true;
        });

        return {
          distribution: expectedDistribution,
          passes,
          tests,
          summary: passes
            ? 'Data follows normal distribution (p > 0.05)'
            : 'Data does not follow normal distribution (p <= 0.05)'
        };
      } else if (expectedDistribution === 'uniform') {
        const uniformityResult = await this.uniformityTest(data);
        tests.push(uniformityResult);

        return {
          distribution: expectedDistribution,
          passes: uniformityResult.is_uniform,
          tests,
          summary: uniformityResult.is_uniform
            ? 'Data follows uniform distribution'
            : 'Data does not follow uniform distribution'
        };
      } else if (expectedDistribution === 'exponential') {
        const ksResult = await this.ksTest(data, 'expon', params);
        tests.push(ksResult);

        const adResult = await this.andersonDarlingTest(data, 'expon');
        tests.push(adResult);

        const passes = tests.every(t => {
          if ('p_value' in t) {
            return t.p_value > 0.05;
          }
          if ('rejected_at' in t) {
            return t.rejected_at === null;
          }
          return true;
        });

        return {
          distribution: expectedDistribution,
          passes,
          tests,
          summary: passes
            ? 'Data follows exponential distribution (p > 0.05)'
            : 'Data does not follow exponential distribution (p <= 0.05)'
        };
      }

      throw new Error(`Unsupported distribution: ${expectedDistribution}`);
    } catch (error) {
      throw new Error(
        `Distribution validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async testCategoricalDistribution(
    observed: Record<string, number>,
    expected: Record<string, number>
  ): Promise<ChiSquaredResult> {
    const categories = Object.keys(observed);
    const observedFreq = categories.map(cat => observed[cat] || 0);
    const expectedFreq = categories.map(cat => expected[cat] || 0);

    return this.chiSquaredTest(observedFreq, expectedFreq);
  }

  private async runPythonScript(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.scriptPath, ...args]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  setPythonPath(pythonPath: string): void {
    this.pythonPath = pythonPath;
  }

  getPythonPath(): string {
    return this.pythonPath;
  }

  async isPythonAvailable(): Promise<boolean> {
    try {
      await this.runPythonScript(['chi_squared', '[1, 2, 3]', '[1, 2, 3]']);
      return true;
    } catch {
      return false;
    }
  }
}
