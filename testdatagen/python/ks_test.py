#!/usr/bin/env python3
"""
Perform Kolmogorov-Smirnov test
"""

import sys
import json
import argparse
import numpy as np
from scipy import stats

def ks_test(data, distribution='normal', params=None):
    """
    Perform Kolmogorov-Smirnov test for distribution fit.

    Args:
        data: Sample data
        distribution: Distribution type ('normal' or 'zipf')
        params: Distribution parameters

    Returns:
        dict with statistic and pvalue
    """
    data = np.array(data)

    if params is None:
        params = {}

    if distribution == 'normal':
        mean = params.get('mean', np.mean(data))
        std = params.get('std', np.std(data))
        statistic, pvalue = stats.kstest(data, 'norm', args=(mean, std))
    elif distribution == 'zipf':
        a = params.get('a', 1.5)
        statistic, pvalue = stats.kstest(data, 'zipf', args=(a,))
    else:
        raise ValueError(f"Unsupported distribution: {distribution}")

    return {
        'statistic': float(statistic),
        'pvalue': float(pvalue)
    }

def main():
    parser = argparse.ArgumentParser(description='Perform KS test')
    parser.add_argument('--data', type=str, required=True, help='Sample data (JSON array)')
    parser.add_argument('--distribution', type=str, default='normal', help='Distribution type')
    parser.add_argument('--params', type=str, help='Distribution parameters (JSON object)')

    args = parser.parse_args()

    try:
        data = json.loads(args.data)
        params = json.loads(args.params) if args.params else None

        result = ks_test(data, args.distribution, params)
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
