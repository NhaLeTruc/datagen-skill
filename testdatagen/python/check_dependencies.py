#!/usr/bin/env python3
"""
Check if required Python dependencies are installed
"""

import sys
import json

def check_dependencies():
    """
    Check if scipy and numpy are installed.

    Returns:
        dict with availability status and missing packages
    """
    missing = []

    try:
        import numpy
    except ImportError:
        missing.append('numpy')

    try:
        import scipy
    except ImportError:
        missing.append('scipy')

    return {
        'all_available': len(missing) == 0,
        'missing': missing
    }

def main():
    try:
        result = check_dependencies()
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
