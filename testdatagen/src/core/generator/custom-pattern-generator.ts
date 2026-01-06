export interface PatternToken {
  type: 'literal' | 'digit' | 'letter' | 'alphanumeric' | 'hex' | 'custom';
  value?: string;
  count: number;
  options?: string[];
}

export class CustomPatternGenerator {
  private seed: number;
  private rng: () => number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
    this.rng = this.createSeededRandom(this.seed);
  }

  generate(pattern: string, count: number = 1): string[] {
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
      results.push(this.generateSingle(pattern));
    }

    return results;
  }

  generateSingle(pattern: string): string {
    const tokens = this.parsePattern(pattern);
    return tokens.map(token => this.generateFromToken(token)).join('');
  }

  parsePattern(pattern: string): PatternToken[] {
    const tokens: PatternToken[] = [];
    let i = 0;

    while (i < pattern.length) {
      const char = pattern[i];

      if (char === '#') {
        const count = this.countRepeats(pattern, i, '#');
        tokens.push({ type: 'digit', count });
        i += count;
      } else if (char === 'X' || char === 'x') {
        const count = this.countRepeats(pattern, i, char);
        tokens.push({ type: 'letter', count });
        i += count;
      } else if (char === 'A') {
        const count = this.countRepeats(pattern, i, 'A');
        tokens.push({ type: 'alphanumeric', count });
        i += count;
      } else if (char === 'H') {
        const count = this.countRepeats(pattern, i, 'H');
        tokens.push({ type: 'hex', count });
        i += count;
      } else if (char === '{') {
        const closeIndex = pattern.indexOf('}', i);
        if (closeIndex === -1) {
          throw new Error(`Unclosed brace at position ${i}`);
        }

        const content = pattern.substring(i + 1, closeIndex);
        const token = this.parseCustomToken(content);
        tokens.push(token);
        i = closeIndex + 1;
      } else if (char === '[') {
        const closeIndex = pattern.indexOf(']', i);
        if (closeIndex === -1) {
          throw new Error(`Unclosed bracket at position ${i}`);
        }

        const content = pattern.substring(i + 1, closeIndex);
        const options = content.split(',').map(s => s.trim());
        tokens.push({ type: 'custom', count: 1, options });
        i = closeIndex + 1;
      } else if (char === '\\') {
        if (i + 1 < pattern.length) {
          tokens.push({ type: 'literal', value: pattern[i + 1], count: 1 });
          i += 2;
        } else {
          throw new Error('Trailing backslash in pattern');
        }
      } else {
        tokens.push({ type: 'literal', value: char, count: 1 });
        i++;
      }
    }

    return tokens;
  }

  private countRepeats(pattern: string, start: number, char: string): number {
    let count = 0;
    while (start + count < pattern.length && pattern[start + count] === char) {
      count++;
    }
    return count;
  }

  private parseCustomToken(content: string): PatternToken {
    if (content.includes(':')) {
      const [type, countStr] = content.split(':');

      if (type === 'd' || type === 'digit') {
        return { type: 'digit', count: parseInt(countStr, 10) || 1 };
      } else if (type === 'l' || type === 'letter') {
        return { type: 'letter', count: parseInt(countStr, 10) || 1 };
      } else if (type === 'a' || type === 'alphanumeric') {
        return { type: 'alphanumeric', count: parseInt(countStr, 10) || 1 };
      } else if (type === 'h' || type === 'hex') {
        return { type: 'hex', count: parseInt(countStr, 10) || 1 };
      }
    }

    return { type: 'literal', value: content, count: 1 };
  }

  private generateFromToken(token: PatternToken): string {
    switch (token.type) {
      case 'literal':
        return token.value || '';

      case 'digit':
        return this.generateDigits(token.count);

      case 'letter':
        return this.generateLetters(token.count);

      case 'alphanumeric':
        return this.generateAlphanumeric(token.count);

      case 'hex':
        return this.generateHex(token.count);

      case 'custom':
        if (token.options && token.options.length > 0) {
          const index = Math.floor(this.rng() * token.options.length);
          return token.options[index];
        }
        return '';

      default:
        return '';
    }
  }

  private generateDigits(count: number): string {
    let result = '';
    for (let i = 0; i < count; i++) {
      result += Math.floor(this.rng() * 10);
    }
    return result;
  }

  private generateLetters(count: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < count; i++) {
      result += letters[Math.floor(this.rng() * letters.length)];
    }
    return result;
  }

  private generateAlphanumeric(count: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < count; i++) {
      result += chars[Math.floor(this.rng() * chars.length)];
    }
    return result;
  }

  private generateHex(count: number): string {
    const hex = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < count; i++) {
      result += hex[Math.floor(this.rng() * hex.length)];
    }
    return result;
  }

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.rng = this.createSeededRandom(seed);
  }

  getSeed(): number {
    return this.seed;
  }

  static validatePattern(pattern: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    let braceDepth = 0;
    let bracketDepth = 0;
    let escaped = false;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth < 0) {
          errors.push(`Unmatched closing brace at position ${i}`);
        }
      } else if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
        if (bracketDepth < 0) {
          errors.push(`Unmatched closing bracket at position ${i}`);
        }
      }
    }

    if (braceDepth > 0) {
      errors.push('Unclosed braces in pattern');
    }

    if (bracketDepth > 0) {
      errors.push('Unclosed brackets in pattern');
    }

    if (escaped) {
      errors.push('Trailing backslash in pattern');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getPatternExamples(): Record<string, string> {
    return {
      'Simple digits': '####',
      'Simple letters': 'XXXX',
      'Mixed': 'ABC-####',
      'Alphanumeric': 'AAAA-AAAA',
      'Hex': 'HHH-HHH',
      'Custom count': '{d:4}-{l:3}',
      'Options': '[Red,Green,Blue]-###',
      'Escaped': 'Order\\#####',
      'Complex': 'USER-[Admin,User]-####-XX',
      'UUID-like': 'HHHHHHHH-HHHH-HHHH-HHHH-HHHHHHHHHHHH'
    };
  }

  generateBatch(patterns: string[], count: number): Record<string, string[]> {
    const results: Record<string, string[]> = {};

    for (const pattern of patterns) {
      results[pattern] = this.generate(pattern, count);
    }

    return results;
  }

  generateWithPrefix(prefix: string, pattern: string, count: number): string[] {
    return this.generate(pattern, count).map(value => prefix + value);
  }

  generateWithSuffix(pattern: string, suffix: string, count: number): string[] {
    return this.generate(pattern, count).map(value => value + suffix);
  }

  generateSequential(pattern: string, start: number, count: number): string[] {
    const results: string[] = [];

    const tokens = this.parsePattern(pattern);

    for (let i = 0; i < count; i++) {
      const current = start + i;
      const generated = tokens.map(token => {
        if (token.type === 'digit') {
          return String(current).padStart(token.count, '0');
        }
        return this.generateFromToken(token);
      }).join('');

      results.push(generated);
    }

    return results;
  }
}

export class PatternLibrary {
  private patterns: Map<string, string>;

  constructor() {
    this.patterns = new Map();
    this.loadDefaultPatterns();
  }

  private loadDefaultPatterns(): void {
    this.patterns.set('sku', 'SKU-####-XX');
    this.patterns.set('order_id', 'ORD-{d:8}');
    this.patterns.set('product_code', 'PRD-[A,B,C,D]-####');
    this.patterns.set('serial', 'SN-HHHHHHHH');
    this.patterns.set('license', 'AAAA-AAAA-AAAA-AAAA');
    this.patterns.set('tracking', 'TRK{d:12}XX');
    this.patterns.set('invoice', 'INV-{d:6}');
    this.patterns.set('ticket', 'TKT-[HIGH,MED,LOW]-####');
  }

  addPattern(name: string, pattern: string): void {
    this.patterns.set(name, pattern);
  }

  getPattern(name: string): string | undefined {
    return this.patterns.get(name);
  }

  listPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }

  removePattern(name: string): boolean {
    return this.patterns.delete(name);
  }

  hasPattern(name: string): boolean {
    return this.patterns.has(name);
  }
}
