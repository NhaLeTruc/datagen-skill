# Pattern: Distribution Strategies

**Purpose**: Statistical distribution strategies for production-like data patterns

**Constitutional Principle**: Principle III - Realistic Data Patterns (Production-Like Quality)

---

## Overview

Real-world data follows statistical distributions, not uniform randomness. This pattern documents when and how to use different distribution strategies to generate production-like test data.

---

## Distribution Types

### Quick Reference

| Distribution | Use Case | Example | Parameters |
|--------------|----------|---------|------------|
| **Uniform** | Default, no pattern | Random IDs, timestamps | None |
| **Zipf (Power-Law)** | Popularity, frequency | Product orders, user activity | alpha (shape) |
| **Normal (Gaussian)** | Measurements, quantities | Heights, order totals, ratings | mean, std_dev |
| **Exponential** | Wait times, intervals | Time between orders | lambda (rate) |
| **Binomial** | Yes/no outcomes | Success/failure, active/inactive | n (trials), p (probability) |

---

## Uniform Distribution (Default)

### When to Use

- **No pattern expected**: Random selection with equal probability
- **Default behavior**: When no specific distribution is specified
- **Examples**: User IDs, random timestamps, generic selections

### Implementation

```python
import random

def select_uniform(pool):
    return random.choice(pool)  # Equal probability for all items

def generate_uniform_int(min_val, max_val):
    return random.randint(min_val, max_val)  # Each value equally likely
```

### Characteristics

- **Flat distribution**: All values equally likely
- **No clustering**: No hot spots or favorites
- **Predictable**: Mean = (min + max) / 2

### Example

```python
# Foreign key selection with uniform distribution
user_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

for _ in range(1000):
    order.user_id = random.choice(user_ids)

# Result: Each user gets ~100 orders (evenly distributed)
# User 1: ~100, User 2: ~100, ..., User 10: ~100
```

---

## Zipf Distribution (Power-Law)

### When to Use

- **Popularity patterns**: 80/20 rule (Pareto principle)
- **Real-world frequency**: Some items much more common than others
- **Examples**:
  - Product popularity (few products get most orders)
  - User activity (power users vs casual users)
  - Website traffic (few pages get most views)
  - Word frequency (few words used very often)

### Implementation

```python
import numpy as np

def select_zipf(pool, alpha=1.5, seed=None):
    """
    Select from pool using Zipf distribution.

    Args:
        pool: List of items to select from
        alpha: Shape parameter (higher = more skewed)
               - alpha=1.0: Less skewed
               - alpha=1.5: Moderate skew (recommended)
               - alpha=2.0: Very skewed (extreme 80/20)
        seed: Random seed for reproducibility

    Returns:
        Item from pool (first items much more likely)
    """
    if seed is not None:
        np.random.seed(seed)

    # Generate Zipf index (1-based)
    idx = np.random.zipf(alpha) - 1

    # Clamp to valid range
    idx = min(idx, len(pool) - 1)

    return pool[idx]
```

### Characteristics

- **Power-law**: Few items account for most selections
- **Long tail**: Many items selected rarely
- **80/20 rule**: ~20% of items get ~80% of selections (alpha=1.5)

### Example: Product Popularity

```python
# E-commerce: 100 products, Zipf distribution for orders
products = list(range(1, 101))
order_product_selections = []

for _ in range(1000):
    product_id = select_zipf(products, alpha=1.5)
    order_product_selections.append(product_id)

# Result analysis:
# Top 20 products (20%): ~800 orders (80%)
# Remaining 80 products: ~200 orders (20%)
#
# Product 1: ~150 orders (most popular)
# Product 2: ~80 orders
# Product 3: ~50 orders
# ...
# Product 50: ~5 orders
# Product 100: ~1 order (least popular)
```

### Visualization

```text
Orders by Product (Zipf α=1.5)

Product 1  |████████████████████████ (150)
Product 2  |████████████ (80)
Product 3  |████████ (50)
Product 5  |█████ (30)
Product 10 |██ (12)
Product 20 |█ (5)
Product 50 | (2)
Product 100| (1)
```

### Parameter Tuning

```python
# alpha=1.0: Moderate skew (60/40 rule)
select_zipf(products, alpha=1.0)

# alpha=1.5: Strong skew (80/20 rule) - RECOMMENDED
select_zipf(products, alpha=1.5)

# alpha=2.0: Extreme skew (90/10 rule)
select_zipf(products, alpha=2.0)
```

---

## Normal Distribution (Gaussian)

### When to Use

- **Natural measurements**: Heights, weights, temperatures
- **Central tendency**: Values cluster around mean
- **Continuous ranges**: Order totals, ratings, quantities
- **Examples**:
  - Product prices centered around average
  - Order totals (most orders near typical amount)
  - User ages (bell curve distribution)
  - Performance metrics (response times)

### Implementation

```python
import random

def generate_normal(mean, std_dev, min_val=None, max_val=None):
    """
    Generate value from normal distribution.

    Args:
        mean: Center of distribution
        std_dev: Standard deviation (spread)
        min_val: Optional minimum (clip below this)
        max_val: Optional maximum (clip above this)

    Returns:
        Generated value following normal distribution
    """
    value = random.gauss(mean, std_dev)

    # Clip to valid range if specified
    if min_val is not None:
        value = max(value, min_val)
    if max_val is not None:
        value = min(value, max_val)

    return value
```

### Characteristics

- **Bell curve**: Most values near mean
- **68-95-99.7 rule**:
  - 68% within 1 std_dev of mean
  - 95% within 2 std_dev of mean
  - 99.7% within 3 std_dev of mean
- **Symmetrical**: Equal spread on both sides of mean

### Example: Order Totals

```python
# E-commerce order totals: mean $100, std_dev $30
order_totals = []

for _ in range(1000):
    total = generate_normal(mean=100.00, std_dev=30.00, min_val=0.00)
    total = round(total, 2)
    order_totals.append(total)

# Result distribution:
# Mean: ~$100
# ~680 orders: $70-$130 (within 1 std_dev)
# ~950 orders: $40-$160 (within 2 std_dev)
# ~997 orders: $10-$190 (within 3 std_dev)
# Min: ~$0 (clipped)
# Max: ~$200
```

### Visualization

```text
Order Totals (Normal μ=$100, σ=$30)

$0-$20   |█ (5)
$20-$40  |██ (20)
$40-$60  |█████ (80)
$60-$80  |██████████ (150)
$80-$100 |███████████████ (245)  ← Mean
$100-$120|███████████████ (245)
$120-$140|██████████ (150)
$140-$160|█████ (80)
$160-$180|██ (20)
$180-$200|█ (5)
```

### Parameter Tuning

```python
# Narrow spread: most values close to mean
generate_normal(mean=100, std_dev=10)  # 68% in $90-$110

# Wide spread: more variation
generate_normal(mean=100, std_dev=50)  # 68% in $50-$150
```

---

## Exponential Distribution

### When to Use

- **Wait times**: Time between events
- **Intervals**: Time between orders, requests
- **Decay**: Decreasing frequency over time
- **Examples**:
  - Time between customer orders
  - Server request intervals
  - Failure times

### Implementation

```python
import random

def generate_exponential(lambda_rate):
    """
    Generate value from exponential distribution.

    Args:
        lambda_rate: Rate parameter (higher = shorter intervals)
                    Mean = 1 / lambda_rate

    Returns:
        Generated interval (always >= 0)
    """
    return random.expovariate(lambda_rate)
```

### Characteristics

- **Memoryless**: Past doesn't affect future
- **Always positive**: No negative intervals
- **Right-skewed**: Most values small, long tail

### Example: Time Between Orders

```python
# Average 5 orders per hour → lambda = 5/hour → mean interval = 12 minutes
lambda_rate = 5.0  # events per hour
intervals = []

for _ in range(100):
    interval_hours = generate_exponential(lambda_rate)
    interval_minutes = interval_hours * 60
    intervals.append(interval_minutes)

# Result:
# Mean interval: ~12 minutes
# Most intervals: 2-20 minutes
# Long tail: Some intervals 30-60+ minutes
```

---

## Binomial Distribution

### When to Use

- **Binary outcomes**: Success/failure, yes/no
- **Fixed probability**: Consistent likelihood
- **Multiple trials**: Repeated independent events
- **Examples**:
  - Active/inactive users (p=0.7 active)
  - Order completion rate (p=0.95 complete)
  - Product defect rate (p=0.02 defective)

### Implementation

```python
import random

def generate_binomial_outcome(probability):
    """
    Generate binary outcome (True/False).

    Args:
        probability: Probability of True (0.0 to 1.0)

    Returns:
        True or False based on probability
    """
    return random.random() < probability

def generate_binomial_count(n, p):
    """
    Generate count of successes in n trials.

    Args:
        n: Number of trials
        p: Probability of success per trial

    Returns:
        Count of successes (0 to n)
    """
    import numpy as np
    return np.random.binomial(n, p)
```

### Example: User Active Status

```python
# 70% of users are active
users = []

for i in range(1, 1001):
    is_active = generate_binomial_outcome(probability=0.7)
    users.append({'id': i, 'is_active': is_active})

# Result:
# ~700 users: is_active=True
# ~300 users: is_active=False
```

---

## Distribution Combinations

### Combining Multiple Distributions

**Example**: E-commerce order generation with realistic patterns

```python
def generate_realistic_order(user_ids, product_ids):
    order = {}

    # User selection: Zipf (power users order more)
    order['user_id'] = select_zipf(user_ids, alpha=1.3)

    # Product selection: Zipf (popular products ordered more)
    order['product_id'] = select_zipf(product_ids, alpha=1.5)

    # Quantity: Normal distribution (most orders 1-5 items)
    order['quantity'] = int(generate_normal(mean=2, std_dev=1.5, min_val=1, max_val=10))

    # Total: Normal distribution around mean price
    order['total'] = generate_normal(mean=75.00, std_dev=35.00, min_val=5.00)
    order['total'] = round(order['total'], 2)

    # Status: Binomial (95% complete, 5% pending/cancelled)
    if generate_binomial_outcome(probability=0.95):
        order['status'] = 'completed'
    else:
        order['status'] = random.choice(['pending', 'cancelled'])

    # Timestamp: Exponential intervals between orders
    # (generated separately in time series)

    return order
```

---

## Distribution Selection Guide

### Decision Tree

```text
What are you generating?

├─ Foreign keys (user_id, product_id)
│  ├─ Equal probability for all? → UNIFORM
│  └─ Some items more popular? → ZIPF
│
├─ Measurements (prices, quantities, ages)
│  ├─ Cluster around average? → NORMAL
│  └─ Fixed categories? → UNIFORM
│
├─ Time intervals (between orders, events)
│  └─ Independent random intervals? → EXPONENTIAL
│
├─ Binary outcomes (active/inactive, success/failure)
│  └─ Fixed probability? → BINOMIAL
│
└─ No specific pattern needed? → UNIFORM (default)
```

### Real-World Examples

| Data Type | Distribution | Reasoning |
|-----------|--------------|-----------|
| User activity (order frequency) | Zipf | Power users vs casual users |
| Product popularity | Zipf | Few bestsellers, many niche products |
| Order totals | Normal | Most orders near average, few extremes |
| Product prices | Normal | Cluster around market average |
| User ages | Normal | Bell curve distribution |
| Time between orders | Exponential | Random independent events |
| Account status (active/inactive) | Binomial | Fixed activation rate |
| Primary key selection (random) | Uniform | No pattern expected |

---

## Implementation Examples

### Example 1: E-Commerce Product Orders (Zipf)

```python
# Generate 1000 orders with realistic product popularity
products = list(range(1, 101))  # 100 products
orders = []

for order_id in range(1, 1001):
    product_id = select_zipf(products, alpha=1.5)
    orders.append({'order_id': order_id, 'product_id': product_id})

# Validation: Top 20 products should get ~800 orders
top_20_count = sum(1 for o in orders if o['product_id'] <= 20)
assert 750 <= top_20_count <= 850, "Zipf distribution validation failed"
```

### Example 2: Order Totals (Normal)

```python
# Generate order totals with normal distribution
orders = []

for order_id in range(1, 1001):
    total = generate_normal(mean=100.00, std_dev=30.00, min_val=5.00)
    total = round(total, 2)
    orders.append({'order_id': order_id, 'total': total})

# Validation: Mean should be ~$100
mean_total = sum(o['total'] for o in orders) / len(orders)
assert 95.00 <= mean_total <= 105.00, "Normal distribution validation failed"
```

### Example 3: User Activity (Zipf + Binomial)

```python
# Generate users with realistic activity patterns
users = []

for user_id in range(1, 1001):
    # Active status: 70% active (binomial)
    is_active = generate_binomial_outcome(probability=0.7)

    # Order count: Zipf distribution (power users)
    if is_active:
        # Active users: 1-50 orders (Zipf distribution)
        order_count = select_zipf(list(range(1, 51)), alpha=1.5)
    else:
        # Inactive users: 0-5 orders
        order_count = random.randint(0, 5)

    users.append({
        'user_id': user_id,
        'is_active': is_active,
        'order_count': order_count
    })
```

---

## Validation and Testing

### Statistical Tests

```python
def validate_distribution(data, distribution_type, **params):
    """
    Validate generated data follows expected distribution.

    Args:
        data: List of generated values
        distribution_type: 'zipf', 'normal', 'uniform', 'exponential', 'binomial'
        params: Distribution parameters (mean, std_dev, alpha, etc.)

    Returns:
        True if distribution matches, False otherwise
    """
    import numpy as np

    if distribution_type == 'normal':
        mean = np.mean(data)
        std = np.std(data)
        expected_mean = params['mean']
        expected_std = params['std_dev']

        # Check if within 5% tolerance
        mean_ok = abs(mean - expected_mean) / expected_mean < 0.05
        std_ok = abs(std - expected_std) / expected_std < 0.10

        return mean_ok and std_ok

    elif distribution_type == 'zipf':
        # Check if top 20% accounts for ~80% of selections
        sorted_data = sorted(data)
        top_20_pct = int(len(sorted_data) * 0.2)
        top_20_values = sorted_data[-top_20_pct:]
        top_20_sum = sum(top_20_values)
        total_sum = sum(data)

        ratio = top_20_sum / total_sum
        return 0.75 <= ratio <= 0.85  # 75-85% (allows some tolerance)

    # Add other distribution tests as needed
    return True
```

---

## Anti-Patterns

### ❌ DON'T: Use Uniform for Everything

```python
# BAD: Unrealistic - all products equally popular
for _ in range(1000):
    product_id = random.choice(products)  # Uniform

# GOOD: Realistic - power-law distribution
for _ in range(1000):
    product_id = select_zipf(products, alpha=1.5)  # Zipf
```

### ❌ DON'T: Ignore Real-World Patterns

```python
# BAD: All orders exactly $100
for _ in range(1000):
    order.total = 100.00

# GOOD: Normal distribution around $100
for _ in range(1000):
    order.total = generate_normal(mean=100.00, std_dev=30.00, min_val=5.00)
```

### ❌ DON'T: Hard-Code Percentages

```python
# BAD: Exactly 80% active (too perfect)
for i in range(1000):
    is_active = (i < 800)  # First 800 active

# GOOD: Binomial with 80% probability (natural variation)
for _ in range(1000):
    is_active = generate_binomial_outcome(probability=0.80)
```

---

## Examples

See distribution strategies in action:
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Zipf for product popularity, Normal for order totals
- **[Blog Platform](../examples/intermediate/blog-platform.md)**: Zipf for user activity, Normal for post engagement

---

**Related**:
- **Workflows**: [Data Generation](../workflows/03-data-generation.md)
- **Patterns**: [Locale Patterns](locale-patterns.md), [Reproducibility](reproducibility.md)
- **Guidelines**: [Constitution Alignment](../guidelines/constitution-alignment.md) - Principle III

---

**Last Updated**: 2026-01-04
