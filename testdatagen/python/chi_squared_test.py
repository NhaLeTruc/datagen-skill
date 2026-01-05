#!/usr/bin/env python3
"""
Perform Chi-squared test for goodness of fit
"""

import sys
import json
import argparse
import numpy as np
from scipy import stats

def chi_squared_test(observed, expected, alpha=0.05):
    """
    Perform Chi-squared goodness of fit test.

    Tests whether observed frequencies match expected frequencies.

    Args:
        observed: Observed frequencies
        expected: Expected frequencies
        alpha: Significance level (default 0.05)

    Returns:
        dict with statistic, pvalue, and significant flag
    """
    observed = np.array(observed)
    expected = np.array(expected)

    if len(observed) != len(expected):
        raise ValueError("Observed and expected must have same length")

    if np.any(expected == 0):
        raise ValueError("Expected frequencies cannot be zero")

    statistic, pvalue = stats.chisquare(observed, expected)

    return {
        'statistic': float(statistic),
        'pvalue': float(pvalue),
        'significant': pvalue < alpha,
        'alpha': alpha
    }

def main():
    parser = argparse.ArgumentParser(description='Perform Chi-squared test')
    parser.add_argument('--observed', type=str, required=True, help='Observed frequencies (JSON array)')
    parser.add_argument('--expected', type=str, required=True, help='Expected frequencies (JSON array)')
    parser.add_argument('--alpha', type=float, default=0.05, help='Significance level (default: 0.05)')

    args = parser.parse_args()

    try:
        observed = json.loads(args.observed)
        expected = json.loads(args.expected)

        result = chi_squared_test(observed, expected, args.alpha)
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
