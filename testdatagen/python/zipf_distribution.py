#!/usr/bin/env python3
"""
Generate values following Zipf distribution
"""

import sys
import json
import argparse
import numpy as np

def generate_zipf(n, a=1.5, seed=None):
    """
    Generate n values following Zipf distribution with parameter a.

    Zipf distribution is commonly used for modeling:
    - Product popularity (80/20 rule)
    - Word frequency
    - Website traffic patterns

    Args:
        n: Number of values to generate
        a: Distribution parameter (default 1.5)
           a > 1: more skewed (fewer items get most selections)
           a = 1: harmonic series
           a < 1: less skewed
        seed: Random seed for reproducibility

    Returns:
        List of integers following Zipf distribution
    """
    if seed is not None:
        np.random.seed(seed)

    values = np.random.zipf(a, n).tolist()
    return values

def main():
    parser = argparse.ArgumentParser(description='Generate Zipf distributed values')
    parser.add_argument('--n', type=int, required=True, help='Number of values')
    parser.add_argument('--a', type=float, default=1.5, help='Zipf parameter (default: 1.5)')
    parser.add_argument('--seed', type=int, help='Random seed')

    args = parser.parse_args()

    try:
        values = generate_zipf(args.n, args.a, args.seed)
        result = {
            'values': values,
            'n': args.n,
            'a': args.a,
            'seed': args.seed
        }
        print(json.dumps(result))
        sys.exit(0)
    except Exception as e:
        error = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
