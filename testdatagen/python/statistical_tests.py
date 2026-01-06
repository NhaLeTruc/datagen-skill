#!/usr/bin/env python3
"""
Statistical validation tests for generated data
"""
import sys
import json
from scipy import stats
import numpy as np


def chi_squared_test(observed_freq, expected_freq):
    """
    Perform Chi-squared goodness of fit test

    Args:
        observed_freq: List of observed frequencies
        expected_freq: List of expected frequencies

    Returns:
        Dictionary with test statistic, p-value, and result
    """
    try:
        observed = np.array(observed_freq)
        expected = np.array(expected_freq)

        if len(observed) != len(expected):
            return {
                'error': 'Observed and expected frequencies must have same length',
                'success': False
            }

        if np.any(expected <= 0):
            return {
                'error': 'Expected frequencies must be positive',
                'success': False
            }

        chi2_stat, p_value = stats.chisquare(observed, expected)

        return {
            'test': 'chi_squared',
            'statistic': float(chi2_stat),
            'p_value': float(p_value),
            'significant': p_value < 0.05,
            'degrees_of_freedom': len(observed) - 1,
            'success': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'success': False
        }


def ks_test(data, distribution='norm', params=None):
    """
    Perform Kolmogorov-Smirnov test for distribution fit

    Args:
        data: List of data values
        distribution: Distribution name ('norm', 'uniform', 'expon', etc.)
        params: Distribution parameters (mean, std for normal, etc.)

    Returns:
        Dictionary with test statistic, p-value, and result
    """
    try:
        data_array = np.array(data)

        if len(data_array) < 2:
            return {
                'error': 'Data must have at least 2 values',
                'success': False
            }

        if distribution == 'norm':
            if params:
                mean = params.get('mean', 0)
                std = params.get('std', 1)
                ks_stat, p_value = stats.kstest(data_array, 'norm', args=(mean, std))
            else:
                mean = np.mean(data_array)
                std = np.std(data_array)
                ks_stat, p_value = stats.kstest(data_array, 'norm', args=(mean, std))
        elif distribution == 'uniform':
            if params:
                loc = params.get('loc', 0)
                scale = params.get('scale', 1)
                ks_stat, p_value = stats.kstest(data_array, 'uniform', args=(loc, scale))
            else:
                loc = np.min(data_array)
                scale = np.max(data_array) - loc
                ks_stat, p_value = stats.kstest(data_array, 'uniform', args=(loc, scale))
        elif distribution == 'expon':
            if params:
                scale = params.get('scale', 1)
                ks_stat, p_value = stats.kstest(data_array, 'expon', args=(0, scale))
            else:
                scale = np.mean(data_array)
                ks_stat, p_value = stats.kstest(data_array, 'expon', args=(0, scale))
        else:
            return {
                'error': f'Unsupported distribution: {distribution}',
                'success': False
            }

        return {
            'test': 'kolmogorov_smirnov',
            'distribution': distribution,
            'statistic': float(ks_stat),
            'p_value': float(p_value),
            'significant': p_value < 0.05,
            'sample_size': len(data_array),
            'success': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'success': False
        }


def anderson_darling_test(data, distribution='norm'):
    """
    Perform Anderson-Darling test for distribution fit

    Args:
        data: List of data values
        distribution: Distribution name ('norm', 'expon', 'logistic', 'gumbel')

    Returns:
        Dictionary with test statistic, critical values, and result
    """
    try:
        data_array = np.array(data)

        if len(data_array) < 2:
            return {
                'error': 'Data must have at least 2 values',
                'success': False
            }

        result = stats.anderson(data_array, dist=distribution)

        significance_levels = [15, 10, 5, 2.5, 1]
        rejected_at = None

        for i, critical_value in enumerate(result.critical_values):
            if result.statistic > critical_value:
                rejected_at = significance_levels[i]
            else:
                break

        return {
            'test': 'anderson_darling',
            'distribution': distribution,
            'statistic': float(result.statistic),
            'critical_values': {
                f'{sl}%': float(cv)
                for sl, cv in zip(significance_levels, result.critical_values)
            },
            'rejected_at': rejected_at,
            'significant': rejected_at is not None,
            'sample_size': len(data_array),
            'success': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'success': False
        }


def shapiro_wilk_test(data):
    """
    Perform Shapiro-Wilk test for normality

    Args:
        data: List of data values

    Returns:
        Dictionary with test statistic, p-value, and result
    """
    try:
        data_array = np.array(data)

        if len(data_array) < 3:
            return {
                'error': 'Data must have at least 3 values',
                'success': False
            }

        if len(data_array) > 5000:
            return {
                'error': 'Shapiro-Wilk test limited to 5000 samples',
                'success': False
            }

        stat, p_value = stats.shapiro(data_array)

        return {
            'test': 'shapiro_wilk',
            'statistic': float(stat),
            'p_value': float(p_value),
            'significant': p_value < 0.05,
            'sample_size': len(data_array),
            'success': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'success': False
        }


def uniformity_test(data):
    """
    Test if data follows uniform distribution using multiple methods

    Args:
        data: List of data values

    Returns:
        Dictionary with results from multiple tests
    """
    try:
        data_array = np.array(data)

        ks_result = ks_test(data, 'uniform')

        n_bins = min(10, int(np.sqrt(len(data_array))))
        hist, _ = np.histogram(data_array, bins=n_bins)
        expected = np.full(n_bins, len(data_array) / n_bins)
        chi2_result = chi_squared_test(hist.tolist(), expected.tolist())

        return {
            'ks_test': ks_result,
            'chi_squared_test': chi2_result,
            'is_uniform': ks_result.get('p_value', 0) > 0.05 and chi2_result.get('p_value', 0) > 0.05,
            'success': True
        }
    except Exception as e:
        return {
            'error': str(e),
            'success': False
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No test specified', 'success': False}))
        sys.exit(1)

    test_type = sys.argv[1]

    try:
        if test_type == 'chi_squared':
            observed = json.loads(sys.argv[2])
            expected = json.loads(sys.argv[3])
            result = chi_squared_test(observed, expected)
        elif test_type == 'ks_test':
            data = json.loads(sys.argv[2])
            distribution = sys.argv[3] if len(sys.argv) > 3 else 'norm'
            params = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            result = ks_test(data, distribution, params)
        elif test_type == 'anderson':
            data = json.loads(sys.argv[2])
            distribution = sys.argv[3] if len(sys.argv) > 3 else 'norm'
            result = anderson_darling_test(data, distribution)
        elif test_type == 'shapiro':
            data = json.loads(sys.argv[2])
            result = shapiro_wilk_test(data)
        elif test_type == 'uniformity':
            data = json.loads(sys.argv[2])
            result = uniformity_test(data)
        else:
            result = {'error': f'Unknown test type: {test_type}', 'success': False}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e), 'success': False}))
        sys.exit(1)


if __name__ == '__main__':
    main()
