# Workflow 2: Dependency Graphing

**Purpose**: Build entity dependency graph from foreign keys and determine generation order via topological sort

**Input**: Constraint catalog from [Schema Analysis (Workflow 1)](01-schema-analysis.md)

**Output**: Generation order (topologically sorted list of tables: parents before children)

---

## Step 1: Build Dependency Graph

### Extract Foreign Key Relationships

From constraint catalog, extract all foreign key relationships:

**Example Constraint Catalog**:
```text
TABLE: users
  Foreign Keys: None

TABLE: products
  Foreign Keys: None

TABLE: orders
  Foreign Keys: user_id → users.id

TABLE: order_items
  Foreign Keys:
    - order_id → orders.id
    - product_id → products.id
```

### Represent as Graph

**Nodes**: Tables
**Edges**: Foreign key dependencies (child → parent)

```text
Graph:
  users ← orders ← order_items
  products ← order_items
```

**Interpretation**:
- `orders` depends on `users` (orders.user_id references users.id)
- `order_items` depends on `orders` (order_items.order_id references orders.id)
- `order_items` depends on `products` (order_items.product_id references products.id)

### Dependency Rules

- **Parent must be generated before child**
- **If A → B (A references B)**, then B must be generated before A
- **Tables with no FKs** have no dependencies (can be generated first)
- **Self-referencing FKs** (e.g., Employee.managerId → Employee.id) require special handling (see Step 3)

---

## Step 2: Perform Topological Sort

**Algorithm**: Kahn's algorithm for topological sorting

### Initialization

1. **Compute in-degree** for each table:
   - In-degree = number of foreign keys (dependencies) for that table

   ```text
   users: in-degree = 0 (no FKs)
   products: in-degree = 0 (no FKs)
   orders: in-degree = 1 (depends on users)
   order_items: in-degree = 2 (depends on orders, products)
   ```

2. **Initialize queue** with tables having in-degree = 0:
   ```text
   Queue: [users, products]
   ```

### Iteration

1. **Dequeue** table with in-degree = 0
2. **Add to generation order**
3. **Decrease in-degree** of tables that depend on this table
4. **If any table reaches in-degree = 0**, add to queue
5. **Repeat** until queue is empty

### Example Execution

```text
Iteration 1:
  Dequeue: users
  Generation Order: [users]
  Decrease in-degree: orders (1 → 0)
  Queue: [products, orders]

Iteration 2:
  Dequeue: products
  Generation Order: [users, products]
  Decrease in-degree: order_items (2 → 1)
  Queue: [orders]

Iteration 3:
  Dequeue: orders
  Generation Order: [users, products, orders]
  Decrease in-degree: order_items (1 → 0)
  Queue: [order_items]

Iteration 4:
  Dequeue: order_items
  Generation Order: [users, products, orders, order_items]
  Queue: []

Done!
```

### Output: Generation Order

```text
GENERATION ORDER:
1. users (no dependencies)
2. products (no dependencies)
3. orders (depends on users)
4. order_items (depends on orders, products)
```

**Interpretation**: Generate tables in this order to ensure all parent records exist before children reference them.

---

## Step 3: Handle Self-Referencing Foreign Keys

### Scenario: Employee.managerId → Employee.id

**Problem**: Circular dependency - employees reference other employees
- Cannot generate all employees at once (no manager exists yet)
- Cannot generate manager first (manager is also an employee)

### Solution: Tiered Generation

**Strategy**:
1. **Tier 1**: Generate root employees with NULL managerId (no manager)
2. **Tier 2**: Generate employees whose manager is in Tier 1
3. **Tier 3**: Generate employees whose manager is in Tier 2
4. **Continue** until all employees generated

**Example**:
```text
Tier 1 (Root):
  Employee(id=1, managerId=NULL)  -- CEO (no manager)

Tier 2 (Reports to Tier 1):
  Employee(id=2, managerId=1)  -- VP reporting to CEO
  Employee(id=3, managerId=1)  -- VP reporting to CEO

Tier 3 (Reports to Tier 2):
  Employee(id=4, managerId=2)  -- Director reporting to VP 2
  Employee(id=5, managerId=3)  -- Director reporting to VP 3

Tier 4 (Reports to Tier 3):
  Employee(id=6, managerId=4)  -- Manager reporting to Director 4
  ...
```

### Detection

**Identify self-referencing FKs** in constraint catalog:
```text
TABLE: employees
  Foreign Keys: manager_id → employees.id (self-reference)
```

**Mark for tiered generation**: Special handling in [Data Generation (Workflow 3)](03-data-generation.md)

### Nullable vs NOT NULL Self-References

**Nullable FK** (e.g., `manager_id INT REFERENCES employees(id)`):
- ✅ Tiered generation works: Root tier has NULL
- ✅ No special constraint changes needed

**NOT NULL FK** (e.g., `manager_id INT NOT NULL REFERENCES employees(id)`):
- ❌ Impossible: Cannot have root employees (all must have manager)
- ❌ Constraint contradiction: Chicken-and-egg problem
- **Error**: Report to user - schema must be corrected (make FK nullable)

---

## Step 4: Detect Circular Dependencies

### Scenario: Department ↔ Employee Circular FKs

**Example**:
```sql
CREATE TABLE departments (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES employees(id)  -- Department has manager (employee)
);

CREATE TABLE employees (
    id INT PRIMARY KEY,
    department_id INT REFERENCES departments(id)  -- Employee belongs to department
);
```

**Problem**: Cycle in dependency graph
- Department depends on Employee (manager_id FK)
- Employee depends on Department (department_id FK)
- Cannot determine which to generate first

### Detection

**Cycle Detection Algorithm**: DFS (Depth-First Search)

1. **Mark all tables as unvisited**
2. **For each table**:
   - Perform DFS following FK edges
   - If encounter already-visited table in current path → **Cycle detected**

**Example**:
```text
Start at departments:
  departments → employees (via manager_id FK)
    employees → departments (via department_id FK)
      departments (already in path!) → CYCLE DETECTED
```

### Resolution Strategy

**Option 1**: Break cycle by making one FK nullable (recommended)
```sql
✅ GOOD:
CREATE TABLE departments (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES employees(id)  -- Nullable allows NULL for initial departments
);

CREATE TABLE employees (
    id INT PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id)
);
```

**Generation order**:
1. Generate departments with manager_id = NULL (no manager yet)
2. Generate employees with department_id referencing departments
3. Update departments to set manager_id referencing employees (optional)

**Option 2**: Generate in stages with updates
1. Generate departments with manager_id = NULL
2. Generate employees with department_id
3. Run UPDATE to set departments.manager_id

**Option 3**: Use deferred constraints (advanced)
```sql
CREATE TABLE departments (
    id INT PRIMARY KEY,
    manager_id INT REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED
);
```
Generate both tables in single transaction, constraints checked at commit.

### Error Handling

If cycle detected with all NOT NULL FKs:
- **Report error**: "Circular dependency detected: departments ↔ employees. At least one FK must be nullable."
- **Suggest**: Make one FK nullable or use staged generation
- **See**: [Circular Dependencies example](../examples/advanced/circular-dependencies.md)

---

## Step 5: Optimize Generation Order

### Consider Multiple Valid Orders

**Example**: If `users` and `products` both have no dependencies, either order is valid:
- ✅ `[users, products, orders, order_items]`
- ✅ `[products, users, orders, order_items]`

### Optimization Heuristics

1. **Prioritize tables with more dependents** (generate high-fan-out tables first)
   - If many tables depend on `users`, generate `users` first

2. **Prioritize smaller tables** (faster generation)
   - If `products` has 10 records and `users` has 1000, generate `products` first

3. **Respect user-specified order** (if provided)
   - User says "Generate users first, then products" → honor preference

**Default**: Alphabetical order as tie-breaker

---

## Step 6: Output Generation Plan

**Deliverable**: Ordered list of tables ready for [Data Generation (Workflow 3)](03-data-generation.md)

**Format**:
```text
GENERATION PLAN
===============

Order: [users, products, orders, order_items]

Details:
1. users (no dependencies)
   - Volume: 1000 records
   - Primary Key: id (sequential)
   - No foreign keys

2. products (no dependencies)
   - Volume: 200 records
   - Primary Key: id (sequential)
   - No foreign keys

3. orders (depends on: users)
   - Volume: 2500 records
   - Primary Key: id (sequential)
   - Foreign Keys: user_id → users.id (pool: 1000 user IDs)

4. order_items (depends on: orders, products)
   - Volume: 5000 records
   - Primary Key: id (sequential)
   - Foreign Keys:
     - order_id → orders.id (pool: 2500 order IDs)
     - product_id → products.id (pool: 200 product IDs)

Special Handling:
- None (no self-referencing FKs or circular dependencies in this schema)
```

### Metadata for Each Table

Include in generation plan:
- **Order position** (1, 2, 3, ...)
- **Dependencies** (which tables must be generated first)
- **Volume** (requested number of records)
- **Primary key strategy** (sequential, UUID, etc.)
- **Foreign key pools** (available parent IDs to reference)

---

## Error Cases

### Unsolvable Dependency Graph

**Scenario**: Cycle with all NOT NULL FKs, no nullable path

**Action**:
- **STOP**: Do not proceed to data generation
- **Report**: "Cannot resolve dependencies: circular dependency with no nullable FK"
- **Suggest**: Make at least one FK in cycle nullable
- **See**: [Troubleshooting](../guidelines/troubleshooting.md) - Circular Foreign Keys

### Orphaned Table

**Scenario**: Table references parent that doesn't exist in schema

**Action**:
- **STOP**: Schema validation failed
- **Report**: "FK references non-existent table: orders.customer_id → customers.id (customers table not found)"
- **Suggest**: Add missing table or remove FK

---

## Examples

See these examples for dependency graphing in action:
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Multi-table dependencies with topological sort
- **[Self-Referencing Hierarchies](../examples/advanced/self-referencing-hierarchies.md)**: Employee.managerId → Employee.id tiered generation
- **[Circular Dependencies](../examples/advanced/circular-dependencies.md)**: Department ↔ Employee cycle resolution

---

**Related**:
- **Previous Workflow**: [Schema Analysis](01-schema-analysis.md)
- **Next Workflow**: [Data Generation](03-data-generation.md)
- **Pattern**: [Constraint Handling](../patterns/constraint-handling.md) - FK handling strategies

---

**Last Updated**: 2026-01-04
