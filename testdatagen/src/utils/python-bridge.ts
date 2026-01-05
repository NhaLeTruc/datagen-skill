import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as path from 'path';

export interface PythonResult {
  success: boolean;
  data?: any;
  error?: string;
  stderr?: string;
}

export class PythonBridge {
  private pythonExecutable: string;
  private scriptsPath: string;

  constructor(pythonExecutable: string = 'python3') {
    this.pythonExecutable = pythonExecutable;
    this.scriptsPath = path.join(__dirname, '../../python');
  }

  /**
   * Execute a Python script with arguments
   */
  public async execute(
    scriptName: string,
    args: string[] = [],
    options?: SpawnOptionsWithoutStdio
  ): Promise<PythonResult> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const pythonArgs = [scriptPath, ...args];

      const process = spawn(this.pythonExecutable, pythonArgs, {
        ...options,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start Python process: ${error.message}`,
          stderr
        });
      });

      process.on('close', (code) => {
        if (code !== 0) {
          resolve({
            success: false,
            error: `Python process exited with code ${code}`,
            stderr: stderr || stdout
          });
          return;
        }

        try {
          const data = JSON.parse(stdout);
          resolve({
            success: true,
            data
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to parse Python output as JSON: ${error}`,
            stderr: stdout
          });
        }
      });
    });
  }

  /**
   * Check if Python is available
   */
  public async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonExecutable, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      process.on('error', () => {
        resolve(false);
      });

      process.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Check if required Python packages are installed
   */
  public async checkDependencies(): Promise<{ available: boolean; missing: string[] }> {
    const result = await this.execute('check_dependencies.py');

    if (!result.success) {
      return {
        available: false,
        missing: ['scipy', 'numpy']
      };
    }

    return {
      available: result.data.all_available,
      missing: result.data.missing || []
    };
  }

  /**
   * Generate values using Zipf distribution
   */
  public async generateZipf(
    n: number,
    a: number = 1.5,
    seed?: number
  ): Promise<number[]> {
    const args = [
      '--n', n.toString(),
      '--a', a.toString()
    ];

    if (seed !== undefined) {
      args.push('--seed', seed.toString());
    }

    const result = await this.execute('zipf_distribution.py', args);

    if (!result.success) {
      throw new Error(`Failed to generate Zipf distribution: ${result.error}`);
    }

    return result.data.values;
  }

  /**
   * Generate values using Normal distribution
   */
  public async generateNormal(
    n: number,
    mean: number = 0,
    std: number = 1,
    seed?: number
  ): Promise<number[]> {
    const args = [
      '--n', n.toString(),
      '--mean', mean.toString(),
      '--std', std.toString()
    ];

    if (seed !== undefined) {
      args.push('--seed', seed.toString());
    }

    const result = await this.execute('normal_distribution.py', args);

    if (!result.success) {
      throw new Error(`Failed to generate Normal distribution: ${result.error}`);
    }

    return result.data.values;
  }

  /**
   * Perform Chi-squared test on distribution
   */
  public async chiSquaredTest(
    observed: number[],
    expected: number[]
  ): Promise<{ statistic: number; pvalue: number; significant: boolean }> {
    const args = [
      '--observed', JSON.stringify(observed),
      '--expected', JSON.stringify(expected)
    ];

    const result = await this.execute('chi_squared_test.py', args);

    if (!result.success) {
      throw new Error(`Failed to perform Chi-squared test: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Perform Kolmogorov-Smirnov test
   */
  public async ksTest(
    data: number[],
    distribution: 'normal' | 'zipf' = 'normal',
    params?: { mean?: number; std?: number; a?: number }
  ): Promise<{ statistic: number; pvalue: number }> {
    const args = [
      '--data', JSON.stringify(data),
      '--distribution', distribution
    ];

    if (params) {
      args.push('--params', JSON.stringify(params));
    }

    const result = await this.execute('ks_test.py', args);

    if (!result.success) {
      throw new Error(`Failed to perform KS test: ${result.error}`);
    }

    return result.data;
  }

  /**
   * Set Python executable path
   */
  public setPythonExecutable(path: string): void {
    this.pythonExecutable = path;
  }

  /**
   * Get Python executable path
   */
  public getPythonExecutable(): string {
    return this.pythonExecutable;
  }
}

export const pythonBridge = new PythonBridge();
