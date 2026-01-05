#!/usr/bin/env python3
"""
Generate values following Normal (Gaussian) distribution
"""

import sys
import json
import argparse
import numpy as np

def generate_normal(n, mean=0, std=1, seed=None):
    """
    Generate n values following Normal distribution.

    Normal distribution is commonly used for modeling:
    - Human heights, weights
    - Test scores
    - Measurement errors
    - Natural phenomena

    Args:
        n: Number of values to generate
        mean: Mean of the distribution (default 0)
        std: Standard deviation (default 1)
        seed: Random seed for reproducibility

    Returns:
        List of floats following Normal distribution
    """
    if seed is not None:
        np.random.seed(seed)

    if std <= 0:
        raise ValueError("Standard deviation must be positive")

    values = np.random.normal(mean, std, n).tolist()
    return values

def main():
    parser = argparse.ArgumentParser(description='Generate Normal distributed values')
    parser.add_argument('--n', type=int, required=True, help='Number of values')
    parser.add_argument('--mean', type=float, default=0, help='Mean (default: 0)')
    parser.add_argument('--std', type=float, default=1, help='Standard deviation (default: 1)')
    parser.add_argument('--seed', type=int, help='Random seed')

    args = parser.parse_args()

    try:
        values = generate_normal(args.n, args.mean, args.std, args.seed)
        result = {
            'values': values,
            'n': args.n,
            'mean': args.mean,
            'std': args.std,
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
