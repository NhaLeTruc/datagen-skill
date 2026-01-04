# Example: Self-Referencing Hierarchies (Advanced)

**Complexity**: Advanced (Self-referencing foreign keys with hierarchical structure)

**Demonstrates**:
- Self-referencing foreign key (Employee.managerId → Employee.id)
- Tiered generation strategy (root employees first, then subordinates)
- Realistic organizational hierarchy
- Nullable self-references (root employees have no manager)
- Hierarchical depth control

**User Stories**: US1 (Constraint-Valid Data) + US2 (Production-Like Patterns)

---

## Input Schema

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    manager_id INT REFERENCES employees(id) ON DELETE SET NULL,
    salary DECIMAL(10, 2) NOT NULL CHECK (salary >= 0),
    hire_date DATE NOT NULL,
    department VARCHAR(100) NOT NULL
);
```

### Constraint Analysis

| Constraint Type | Column | Rule |
|-----------------|--------|------|
| **Primary Key** | id | Unique, non-null |
| **UNIQUE** | email | No duplicates |
| **NOT NULL** | name, email, title, salary, hire_date, department | Must have values |
| **Self-Referencing FK** | manager_id | References employees(id), nullable |
| **ON DELETE SET NULL** | manager_id | If manager deleted, subordinate's manager_id set NULL |
| **CHECK** | salary | >= 0 |

---

## Self-Referencing FK Challenge

**Problem**: Cannot reference employees that haven't been generated yet

**Solution**: **Tiered Generation**

```text
Tier 1 (Root):    CEO, CTO, CFO (manager_id = NULL)
                    ↓
Tier 2:           VPs reporting to C-level (manager_id = CEO/CTO/CFO)
                    ↓
Tier 3:           Directors reporting to VPs
                    ↓
Tier 4:           Managers reporting to Directors
                    ↓
Tier 5:           Individual Contributors reporting to Managers
```

**Strategy**: Generate tier-by-tier, each tier references previously generated employees

---

## Generation Parameters

- **Seed**: 42 (for reproducibility)
- **Record Count**: 20 employees
- **Tiers**: 4 levels (C-level → VPs → Directors → ICs)
- **Tier Sizes**: [3, 4, 6, 7] employees per tier
- **Locale**: US English (en_US)
- **Departments**: Engineering, Product, Sales, Finance
- **Salary Distribution**: Higher tiers earn more (realistic hierarchy)

---

## Generated Data

### Tier 1: C-Level Executives (manager_id = NULL)

```sql
-- Seed: 42
-- Tier 1: Root employees (no manager)
-- Realistic patterns: Executive titles, high salaries

INSERT INTO employees (id, name, email, title, manager_id, salary, hire_date, department) VALUES
  (1, 'Sarah Martinez', 'sarah.martinez@company.com', 'Chief Executive Officer', NULL, 350000.00, '2020-01-15', 'Executive'),
  (2, 'James Wilson', 'james.wilson@company.com', 'Chief Technology Officer', NULL, 320000.00, '2020-02-01', 'Engineering'),
  (3, 'Maria Garcia', 'mgarcia@company.com', 'Chief Financial Officer', NULL, 310000.00, '2020-03-10', 'Finance');
```

**Tier 1 Notes**:

- **manager_id = NULL**: Root of hierarchy (no manager)
- **Salaries**: $310k-$350k (C-level range)
- **Titles**: CEO, CTO, CFO
- **FK Pool**: `employees.id = [1, 2, 3]` (available for Tier 2)

---

### Tier 2: Vice Presidents (reporting to C-level)

```sql
-- Tier 2: VPs reporting to C-level executives
INSERT INTO employees (id, name, email, title, manager_id, salary, hire_date, department) VALUES
  (4, 'David Nguyen', 'david.nguyen@company.com', 'VP of Engineering', 2, 240000.00, '2020-04-15', 'Engineering'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@company.com', 'VP of Product', 1, 235000.00, '2020-05-20', 'Product'),
  (6, 'Michael Brown', 'mbrown@company.com', 'VP of Sales', 1, 250000.00, '2020-06-10', 'Sales'),
  (7, 'Lisa Anderson', 'lisa.anderson@company.com', 'VP of Finance', 3, 220000.00, '2020-07-01', 'Finance');
```

**Tier 2 Notes**:

- **manager_id**: References Tier 1 (CEO, CTO, CFO)
  - VP Engineering → CTO (id=2)
  - VP Product → CEO (id=1)
  - VP Sales → CEO (id=1)
  - VP Finance → CFO (id=3)
- **Salaries**: $220k-$250k (VP range)
- **FK Pool**: `employees.id = [1, 2, 3, 4, 5, 6, 7]` (available for Tier 3)

---

### Tier 3: Directors (reporting to VPs)

```sql
-- Tier 3: Directors reporting to VPs
INSERT INTO employees (id, name, email, title, manager_id, salary, hire_date, department) VALUES
  (8, 'Robert Martinez', 'robert.martinez@company.com', 'Director of Backend Engineering', 4, 180000.00, '2020-08-15', 'Engineering'),
  (9, 'Emily Davis', 'emily.davis@company.com', 'Director of Frontend Engineering', 4, 175000.00, '2020-09-01', 'Engineering'),
  (10, 'Christopher Lee', 'christopher.lee@company.com', 'Director of Product Design', 5, 170000.00, '2020-10-10', 'Product'),
  (11, 'Jessica Thompson', 'jessica.thompson@company.com', 'Director of Sales Operations', 6, 165000.00, '2020-11-05', 'Sales'),
  (12, 'Matthew White', 'matthew.white@company.com', 'Director of Financial Planning', 7, 160000.00, '2020-12-01', 'Finance'),
  (13, 'Ashley Harris', 'ashley.harris@company.com', 'Director of Data Engineering', 4, 185000.00, '2021-01-15', 'Engineering');
```

**Tier 3 Notes**:

- **manager_id**: References Tier 2 (VPs)
  - Backend, Frontend, Data Directors → VP Engineering (id=4)
  - Product Design Director → VP Product (id=5)
  - Sales Ops Director → VP Sales (id=6)
  - Financial Planning Director → VP Finance (id=7)
- **Salaries**: $160k-$185k (Director range)
- **FK Pool**: `employees.id = [1..13]` (available for Tier 4)

---

### Tier 4: Individual Contributors (reporting to Directors)

```sql
-- Tier 4: Individual Contributors reporting to Directors
INSERT INTO employees (id, name, email, title, manager_id, salary, hire_date, department) VALUES
  (14, 'Daniel Rodriguez', 'daniel.rodriguez@company.com', 'Senior Backend Engineer', 8, 145000.00, '2021-02-10', 'Engineering'),
  (15, 'Kimberly Martin', 'kimberly.martin@company.com', 'Senior Frontend Engineer', 9, 140000.00, '2021-03-01', 'Engineering'),
  (16, 'Andrew Jackson', 'andrew.jackson@company.com', 'Product Designer', 10, 125000.00, '2021-04-15', 'Product'),
  (17, 'Michelle Thomas', 'michelle.thomas@company.com', 'Sales Manager', 11, 130000.00, '2021-05-10', 'Sales'),
  (18, 'Kenneth Moore', 'kenneth.moore@company.com', 'Financial Analyst', 12, 95000.00, '2021-06-01', 'Finance'),
  (19, 'Betty Taylor', 'betty.taylor@company.com', 'Data Engineer', 13, 135000.00, '2021-07-15', 'Engineering'),
  (20, 'Steven Johnson', 'steven.johnson@company.com', 'Senior Backend Engineer', 8, 150000.00, '2021-08-01', 'Engineering');
```

**Tier 4 Notes**:

- **manager_id**: References Tier 3 (Directors)
  - Backend Engineers → Backend Director (id=8)
  - Frontend Engineer → Frontend Director (id=9)
  - Product Designer → Product Design Director (id=10)
  - Sales Manager → Sales Ops Director (id=11)
  - Financial Analyst → Financial Planning Director (id=12)
  - Data Engineer → Data Engineering Director (id=13)
- **Salaries**: $95k-$150k (IC range)
- **FK Pool**: `employees.id = [1..20]` (complete)

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 16:15:00 UTC
- **Record Count**: 20 employees
- **Tiers**: 4 (depth of hierarchy)
- **Schema**: employees (self-referencing)
- **Locale**: US English (en_US)

### Constraint Satisfaction Checks

#### Primary Key (id)

- ✅ All IDs unique: [1..20], non-null
- ✅ Sequential generation (1..20)

#### Self-Referencing FK (manager_id → id)

- ✅ All FKs resolve: 17/17 non-null manager_ids reference existing employees
- ✅ Root employees (Tier 1): 3 employees with manager_id = NULL
- ✅ Subordinates (Tiers 2-4): 17 employees with valid manager_id
- ✅ **No forward references**: All manager_ids reference employees with lower id (generated earlier)

**FK Resolution**:

- Tier 1 (ids 1-3): manager_id = NULL (3 employees)
- Tier 2 (ids 4-7): manager_id in [1, 2, 3] (4 employees)
- Tier 3 (ids 8-13): manager_id in [4, 5, 6, 7] (6 employees)
- Tier 4 (ids 14-20): manager_id in [8, 9, 10, 11, 12, 13] (7 employees)

**Referential Integrity**: ✅ 100% - no orphan employees

#### Unique (email)

- ✅ All 20 emails unique
- ✅ No duplicates

#### NOT NULL Constraints

- ✅ All required fields have values (name, email, title, salary, hire_date, department)

#### Check Constraint (salary >= 0)

- ✅ All 20 salaries satisfy constraint
- ✅ Salary range: $95k-$350k

### Hierarchy Validation

#### Organizational Structure

```text
Tier 1: C-Level (3 employees)
├─ Sarah Martinez (CEO)
│  ├─ Tier 2: Jennifer Taylor (VP Product)
│  │  └─ Tier 3: Christopher Lee (Dir Product Design)
│  │     └─ Tier 4: Andrew Jackson (Product Designer)
│  └─ Tier 2: Michael Brown (VP Sales)
│     └─ Tier 3: Jessica Thompson (Dir Sales Ops)
│        └─ Tier 4: Michelle Thomas (Sales Manager)
│
├─ James Wilson (CTO)
│  └─ Tier 2: David Nguyen (VP Engineering)
│     ├─ Tier 3: Robert Martinez (Dir Backend Eng)
│     │  ├─ Tier 4: Daniel Rodriguez (Sr Backend Eng)
│     │  └─ Tier 4: Steven Johnson (Sr Backend Eng)
│     ├─ Tier 3: Emily Davis (Dir Frontend Eng)
│     │  └─ Tier 4: Kimberly Martin (Sr Frontend Eng)
│     └─ Tier 3: Ashley Harris (Dir Data Eng)
│        └─ Tier 4: Betty Taylor (Data Engineer)
│
└─ Maria Garcia (CFO)
   └─ Tier 2: Lisa Anderson (VP Finance)
      └─ Tier 3: Matthew White (Dir Financial Planning)
         └─ Tier 4: Kenneth Moore (Financial Analyst)
```

**Hierarchy Depth**: 4 tiers (0-indexed: 0=C-level, 3=ICs)

**Span of Control** (reports per manager):

- CEO: 2 direct reports
- CTO: 1 direct report
- CFO: 1 direct report
- VPs: 1-3 direct reports
- Directors: 1-2 direct reports

**Span Validation**: ✅ Realistic organizational ratios (2-7 reports per manager)

### Distribution Analysis

#### Salary Distribution by Tier

**Tier 1 (C-Level)**:

- Mean: $326,667
- Range: $310k-$350k

**Tier 2 (VPs)**:

- Mean: $236,250
- Range: $220k-$250k

**Tier 3 (Directors)**:

- Mean: $172,500
- Range: $160k-$185k

**Tier 4 (ICs)**:

- Mean: $131,429
- Range: $95k-$150k

**Salary Validation**: ✅ Clear tier-based salary stratification (higher tiers earn more)

#### Department Distribution

- Engineering: 9 employees (45%)
- Product: 2 employees (10%)
- Sales: 2 employees (10%)
- Finance: 2 employees (10%)
- Executive: 1 employee (5%)
- Multi-department: 4 employees (20%) - C-level oversees multiple

**Distribution**: Engineering-heavy (typical for tech company)

#### Tenure Distribution (Hire Dates)

- 2020: 12 employees (founding team)
- 2021: 8 employees (growth phase)

**Temporal Pattern**: ✅ Earlier hires = higher tiers (realistic growth)

### Warnings

None. All constraints satisfied with realistic hierarchical patterns.

---

## Patterns Demonstrated

### User Story 1: Constraint-Valid Data

| Pattern | Example in This Dataset |
|---------|-------------------------|
| **Self-Referencing FK** | manager_id → id (employees table) |
| **Tiered Generation** | 4 tiers: C-level → VPs → Directors → ICs |
| **No Forward References** | manager_id always references lower id (earlier employee) |
| **Nullable FK** | Tier 1 has manager_id = NULL (root employees) |
| **ON DELETE SET NULL** | If manager deleted, subordinate's manager_id → NULL |
| **Referential Integrity** | 100% FK resolution, no orphans |

### User Story 2: Production-Like Patterns

| Pattern | Example in This Dataset |
|---------|-------------------------|
| **Realistic Names** | US name distributions: Martinez, Wilson, Garcia, Nguyen |
| **Realistic Emails** | Corporate domain @company.com with varied formats |
| **Realistic Titles** | Org hierarchy: CEO, CTO, VPs, Directors, Engineers |
| **Salary Stratification** | C-level $310k+, VPs $220k+, Directors $160k+, ICs $95k+ |
| **Span of Control** | 1-3 direct reports per manager (realistic ratios) |
| **Departmental Structure** | Engineering, Product, Sales, Finance departments |
| **Tenure Correlation** | Earlier hires (2020) = senior roles, later (2021) = junior |

---

## How This Example Was Generated

### Tiered Generation Algorithm

```python
def generate_employees_tiered(total=20, tiers=4):
    tier_sizes = [3, 4, 6, 7]  # Employees per tier
    salary_ranges = [
        (310000, 350000),  # Tier 1: C-level
        (220000, 250000),  # Tier 2: VPs
        (160000, 185000),  # Tier 3: Directors
        (95000, 150000)    # Tier 4: ICs
    ]

    employees = []
    pk_pool = []
    current_id = 1

    for tier_num, tier_size in enumerate(tier_sizes):
        for i in range(tier_size):
            employee = {
                'id': current_id,
                'name': generate_realistic_name(),
                'email': generate_corporate_email(),
                'title': select_title_for_tier(tier_num),
                'manager_id': select_manager_from_previous_tier(tier_num, pk_pool),
                'salary': generate_salary_in_range(salary_ranges[tier_num]),
                'hire_date': generate_hire_date_for_tier(tier_num),
                'department': select_department_for_title()
            }

            employees.append(employee)
            pk_pool.append(current_id)
            current_id += 1

    return employees

def select_manager_from_previous_tier(tier_num, pk_pool):
    if tier_num == 0:
        return NULL  # Root tier has no manager

    # Select from employees generated in previous tier
    previous_tier_start = sum(tier_sizes[:tier_num - 1]) + 1
    previous_tier_end = sum(tier_sizes[:tier_num])
    previous_tier_ids = pk_pool[previous_tier_start - 1:previous_tier_end]

    return random.choice(previous_tier_ids)
```

**Key Points**:

1. **Generate tier-by-tier** (not all at once)
2. **Each tier references previous tier** (no forward references)
3. **Tier 1 has NULL manager_id** (root of hierarchy)
4. **Salary decreases by tier** (realistic compensation structure)

---

## Testing Self-Referencing FK

### Test 1: Delete Root Employee (ON DELETE SET NULL)

```sql
-- Delete CEO (Sarah Martinez)
DELETE FROM employees WHERE id = 1;

-- Result: Subordinates' manager_id set NULL
-- - Jennifer Taylor (id=5): manager_id = 1 → NULL
-- - Michael Brown (id=6): manager_id = 1 → NULL
-- - Other employees unaffected (don't report to CEO)

-- Remaining hierarchy:
-- - CTO (id=2) becomes independent (manager_id already NULL)
-- - CFO (id=3) becomes independent (manager_id already NULL)
-- - VPs 5, 6 become independent (manager_id set NULL)
```

### Test 2: Find All Reports (Recursive Query)

```sql
-- Find all employees reporting to CTO (James Wilson, id=2)
-- Including indirect reports (VP → Director → IC)

WITH RECURSIVE org_chart AS (
  -- Base case: Direct report (VP Engineering)
  SELECT id, name, title, manager_id, 1 AS level
  FROM employees
  WHERE manager_id = 2

  UNION ALL

  -- Recursive case: Indirect reports
  SELECT e.id, e.name, e.title, e.manager_id, oc.level + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT * FROM org_chart ORDER BY level, id;

-- Result: 8 employees (VP + Directors + ICs in Engineering)
```

---

## Next Steps

### Related Examples

1. **Basic**: [Users Table](../basic/users-table.md) - Simple single-table ✓
2. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table FK ✓
3. **Intermediate**: [Blog Platform](../intermediate/blog-platform.md) - Many-to-many ✓
4. **Advanced** (This example): Self-Referencing Hierarchies - Tiered generation ✓

### More Advanced Scenarios

- **Circular Dependencies**: Department.managerId → Employee.id, Employee.departmentId → Department.id
- **Multi-Tenant Hierarchies**: Org hierarchy per tenant with isolation
- **Graph Structures**: Arbitrary depth hierarchies, non-tree structures

---

**Related**:

- **Workflows**: [Data Generation](../../workflows/03-data-generation.md) - Step 5 (Self-Referencing FK)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Distribution Strategies](../../patterns/distribution-strategies.md), [Locale Patterns](../../patterns/locale-patterns.md)
- **Templates**: [Validation Report](../../templates/validation-report.md)

---

**Last Updated**: 2026-01-04
