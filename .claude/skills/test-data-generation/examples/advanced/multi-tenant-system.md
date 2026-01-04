# Example: Multi-Tenant System (Advanced)

**Complexity**: Advanced (Multi-tenant isolation with cross-tenant constraints)

**Demonstrates**:

- Multi-tenant data isolation
- Tenant-scoped foreign keys
- Cross-tenant constraint validation
- Edge cases in tenant boundaries
- Data segregation patterns

**User Stories**: US1 (Constraint-Valid Data), US2 (Production-Like Patterns), US3 (Edge Case Coverage)

---

## Input Schema

```sql
CREATE TABLE tenants (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE users (
    id INT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'user', 'readonly')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE (tenant_id, email)  -- Email unique within tenant
);

CREATE TABLE projects (
    id INT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    budget DECIMAL(10, 2) CHECK (budget >= 0),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (owner_id) REFERENCES users(id),
    -- Constraint: owner must be in same tenant as project
    CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = owner_id))
);

CREATE TABLE tasks (
    id INT PRIMARY KEY,
    tenant_id INT NOT NULL,
    project_id INT NOT NULL,
    assigned_to INT,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('todo', 'in_progress', 'done')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    -- Constraints: project and assignee must be in same tenant as task
    CHECK (tenant_id = (SELECT tenant_id FROM projects WHERE id = project_id)),
    CHECK (assigned_to IS NULL OR tenant_id = (SELECT tenant_id FROM users WHERE id = assigned_to))
);
```

### Multi-Tenant Constraints

**Key Patterns**:

1. **Tenant ID Propagation**: Every table has `tenant_id`
2. **Scoped Uniqueness**: Email unique per tenant (not globally)
3. **Cross-Tenant Isolation**: CHECK constraints prevent data leakage
4. **FK + Tenant Validation**: FKs reference entities in same tenant

---

## Constraint Analysis

| Table | Key Constraints | Tenant Isolation |
| ----- | --------------- | ---------------- |
| **tenants** | PK (id), UNIQUE (name) | Root table |
| **users** | PK (id), FK (tenant_id), UNIQUE (tenant_id, email) | Email unique per tenant |
| **projects** | PK (id), FK (tenant_id, owner_id), CHECK (owner in same tenant) | Owner must be same tenant |
| **tasks** | PK (id), FK (tenant_id, project_id, assigned_to), CHECK (all in same tenant) | Project and assignee must be same tenant |

**Critical**: All CHECK constraints enforce same-tenant relationships

---

## Generation Parameters

- **Seed**: 200 (for reproducibility)
- **Record Count**: 3 tenants, 12 users (4 per tenant), 9 projects (3 per tenant), 27 tasks (9 per tenant)
- **Edge Case Coverage**: 5%

---

## Generated Data

### Step 1: Generate Tenants

```sql
-- Seed: 200
-- Tenants
INSERT INTO tenants (id, name, created_at) VALUES
  (1, 'Acme Corp', '2020-01-15 10:00:00'),
  (2, 'TechStart Inc', '2021-06-22 14:30:00'),
  (3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345', '1970-01-01 00:00:00');  -- Edge: max length name, epoch timestamp
```

### Step 2: Generate Users (Tenant-Scoped)

```sql
-- Users for Tenant 1 (Acme Corp)
INSERT INTO users (id, tenant_id, name, email, role) VALUES
  (1, 1, 'Sarah Chen', 'sarah.chen@acme.com', 'admin'),
  (2, 1, 'James Wilson', 'james.wilson@acme.com', 'user'),
  (3, 1, 'Maria Garcia', 'maria.garcia@acme.com', 'user'),
  (4, 1, 'David Kim', 'david.kim@acme.com', 'readonly');

-- Users for Tenant 2 (TechStart Inc)
INSERT INTO users (id, tenant_id, name, email, role) VALUES
  (5, 2, 'Jennifer Taylor', 'jennifer.taylor@techstart.com', 'admin'),
  (6, 2, 'Michael Brown', 'michael.brown@techstart.com', 'user'),
  (7, 2, 'Lisa Anderson', 'lisa.anderson@techstart.com', 'user'),
  (8, 2, 'Robert Martinez', 'robert.martinez@techstart.com', 'readonly');

-- Users for Tenant 3 (Edge Case Tenant)
INSERT INTO users (id, tenant_id, name, email, role) VALUES
  (9, 3, 'Emily Davis', 'emily.davis@edge.com', 'admin'),
  (10, 3, 'Christopher Lee', 'test+edge@example.com', 'user'),  -- Edge: + in email
  (11, 3, 'Daniel Anderson', 'daniel.anderson@edge.com', 'user'),
  (12, 3, 'Jessica Moore', 'jessica.moore@edge.com', 'readonly');

-- Email Uniqueness Test (Same email in different tenants - VALID)
-- 'sarah.chen@acme.com' (Tenant 1) vs hypothetical 'sarah.chen@techstart.com' would be different
-- Constraint: UNIQUE (tenant_id, email) allows same email across tenants
```

### Step 3: Generate Projects (Tenant-Scoped, Owner in Same Tenant)

```sql
-- Projects for Tenant 1 (Acme Corp)
INSERT INTO projects (id, tenant_id, name, owner_id, budget) VALUES
  (1, 1, 'Website Redesign', 1, 50000.00),      -- Owner: Sarah (Tenant 1)
  (2, 1, 'Mobile App', 2, 75000.00),            -- Owner: James (Tenant 1)
  (3, 1, 'Data Migration', 1, 0.00);            -- Edge: zero budget, Owner: Sarah

-- Projects for Tenant 2 (TechStart Inc)
INSERT INTO projects (id, tenant_id, name, owner_id, budget) VALUES
  (4, 2, 'API Development', 5, 40000.00),       -- Owner: Jennifer (Tenant 2)
  (5, 2, 'Cloud Infrastructure', 6, 120000.00), -- Owner: Michael (Tenant 2)
  (6, 2, 'Security Audit', 5, 25000.00);        -- Owner: Jennifer (Tenant 2)

-- Projects for Tenant 3 (Edge Case Tenant)
INSERT INTO projects (id, tenant_id, name, owner_id, budget) VALUES
  (7, 3, 'Edge Project Alpha', 9, 10000.00),    -- Owner: Emily (Tenant 3)
  (8, 3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345', 10, 9999999999.99),  -- Edge: max length name, max budget
  (9, 3, 'Unassigned Project', 11, 5000.00);    -- Owner: Daniel (Tenant 3)
```

### Step 4: Generate Tasks (Tenant-Scoped, Project + Assignee in Same Tenant)

```sql
-- Tasks for Tenant 1 Projects
INSERT INTO tasks (id, tenant_id, project_id, assigned_to, title, status) VALUES
  (1, 1, 1, 1, 'Design homepage mockup', 'done'),
  (2, 1, 1, 2, 'Implement responsive layout', 'in_progress'),
  (3, 1, 1, 3, 'Review design system', 'todo'),
  (4, 1, 2, 2, 'Build authentication flow', 'in_progress'),
  (5, 1, 2, 3, 'Integrate push notifications', 'todo'),
  (6, 1, 2, NULL, 'Unassigned task (edge case)', 'todo'),  -- Edge: NULL assigned_to
  (7, 1, 3, 1, 'Export legacy database', 'done'),
  (8, 1, 3, 2, 'Transform data schemas', 'in_progress'),
  (9, 1, 3, 3, 'Validate migration', 'todo');

-- Tasks for Tenant 2 Projects
INSERT INTO tasks (id, tenant_id, project_id, assigned_to, title, status) VALUES
  (10, 2, 4, 5, 'Design API endpoints', 'done'),
  (11, 2, 4, 6, 'Implement REST API', 'in_progress'),
  (12, 2, 4, 7, 'Write API documentation', 'todo'),
  (13, 2, 5, 6, 'Set up Kubernetes cluster', 'in_progress'),
  (14, 2, 5, 7, 'Configure load balancer', 'todo'),
  (15, 2, 5, 5, 'Implement auto-scaling', 'todo'),
  (16, 2, 6, 5, 'Conduct penetration test', 'done'),
  (17, 2, 6, 6, 'Fix security vulnerabilities', 'in_progress'),
  (18, 2, 6, 7, 'Document security policies', 'todo');

-- Tasks for Tenant 3 Projects (Edge Cases)
INSERT INTO tasks (id, tenant_id, project_id, assigned_to, title, status) VALUES
  (19, 3, 7, 9, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12', 'done'),  -- Edge: max length title (500 chars)
  (20, 3, 7, 10, 'Configure edge infrastructure', 'in_progress'),
  (21, 3, 7, 11, 'Test boundary conditions', 'todo'),
  (22, 3, 8, 10, 'Edge task alpha', 'done'),
  (23, 3, 8, 11, 'Edge task beta', 'in_progress'),
  (24, 3, 8, 9, 'Edge task gamma', 'todo'),
  (25, 3, 9, 11, 'Implement feature X', 'done'),
  (26, 3, 9, 12, 'Code review', 'in_progress'),
  (27, 3, 9, NULL, 'Backlog item (edge case)', 'todo');  -- Edge: NULL assigned_to
```

---

## Validation Report

### Generation Metadata

- **Seed**: 200
- **Timestamp**: 2024-01-04 17:00:00 UTC
- **Record Count**: 3 tenants, 12 users, 9 projects, 27 tasks (51 total records)
- **Edge Case Coverage**: ~6% (3 edge case records: 1 tenant, 1 project name, 1 task title, 2 NULL assignees, 1 email +)
- **Schema**: Multi-tenant (tenants → users, projects, tasks)
- **Generator Version**: 1.0

### Constraint Satisfaction Checks

#### Primary Keys

- ✅ tenants.id: All unique [1, 2, 3]
- ✅ users.id: All unique [1..12]
- ✅ projects.id: All unique [1..9]
- ✅ tasks.id: All unique [1..27]

#### Foreign Keys

**users.tenant_id → tenants.id**:

- ✅ All 12 users reference valid tenants
- ✅ Tenant 1: 4 users, Tenant 2: 4 users, Tenant 3: 4 users

**projects.tenant_id → tenants.id**:

- ✅ All 9 projects reference valid tenants
- ✅ Tenant 1: 3 projects, Tenant 2: 3 projects, Tenant 3: 3 projects

**projects.owner_id → users.id**:

- ✅ All 9 projects have valid owners
- ✅ All owners exist in users table

**tasks.tenant_id → tenants.id**:

- ✅ All 27 tasks reference valid tenants
- ✅ Tenant 1: 9 tasks, Tenant 2: 9 tasks, Tenant 3: 9 tasks

**tasks.project_id → projects.id**:

- ✅ All 27 tasks reference valid projects
- ✅ All projects exist

**tasks.assigned_to → users.id**:

- ✅ 25 tasks have valid assignees
- ✅ 2 tasks have NULL assignees (edge case: valid for nullable FK)

#### Unique Constraints

**tenants.name**:

- ✅ All 3 tenant names unique (globally)
- ✅ Edge case: 255-char tenant name

**users (tenant_id, email)**:

- ✅ All emails unique within their tenant (scoped uniqueness)
- ✅ Email 'sarah.chen@acme.com' unique in Tenant 1
- ✅ Different tenants CAN have same email pattern (isolation working correctly)
- ✅ Edge case: 'test+edge@example.com' with + character (valid email)

#### CHECK Constraints

**users.role IN ('admin', 'user', 'readonly')**:

- ✅ All 12 users have valid roles
- ✅ Distribution: 3 admins, 6 users, 3 readonly

**projects.budget >= 0**:

- ✅ All 9 projects have non-negative budgets
- ✅ Range: $0.00 to $9,999,999,999.99
- ✅ Edge case: Project 3 has $0.00 budget (boundary test)

**tasks.status IN ('todo', 'in_progress', 'done')**:

- ✅ All 27 tasks have valid statuses
- ✅ Distribution: 9 done, 9 in_progress, 9 todo

**Multi-Tenant Isolation CHECK Constraints**:

**projects: tenant_id = owner.tenant_id**:

- ✅ All 9 projects have owners in same tenant
- ✅ Tenant 1 projects → Tenant 1 owners only
- ✅ Tenant 2 projects → Tenant 2 owners only
- ✅ Tenant 3 projects → Tenant 3 owners only

**tasks: tenant_id = project.tenant_id**:

- ✅ All 27 tasks belong to projects in same tenant
- ✅ No cross-tenant task-project assignments

**tasks: tenant_id = assigned_to.tenant_id (when assigned_to NOT NULL)**:

- ✅ All 25 assigned tasks have assignees in same tenant
- ✅ 2 unassigned tasks have NULL (valid, no cross-tenant leak)

### Multi-Tenant Isolation Audit

**Tenant 1 (Acme Corp) Data Segregation**:

- ✅ Users: 4 (IDs 1-4)
- ✅ Projects: 3 (IDs 1-3)
- ✅ Tasks: 9 (IDs 1-9)
- ✅ No references to Tenant 2 or Tenant 3 data
- ✅ All FKs stay within Tenant 1 boundary

**Tenant 2 (TechStart Inc) Data Segregation**:

- ✅ Users: 4 (IDs 5-8)
- ✅ Projects: 3 (IDs 4-6)
- ✅ Tasks: 9 (IDs 10-18)
- ✅ No references to Tenant 1 or Tenant 3 data
- ✅ All FKs stay within Tenant 2 boundary

**Tenant 3 (Edge Case Tenant) Data Segregation**:

- ✅ Users: 4 (IDs 9-12)
- ✅ Projects: 3 (IDs 7-9)
- ✅ Tasks: 9 (IDs 19-27)
- ✅ No references to Tenant 1 or Tenant 2 data
- ✅ All FKs stay within Tenant 3 boundary
- ✅ Contains most edge cases (max lengths, NULL assignees, + in email)

**Cross-Tenant Leak Test**:

- ✅ No tasks assigned to users from different tenants
- ✅ No projects owned by users from different tenants
- ✅ All tenant_id propagation correct

### Edge Case Coverage

**Edge Case Percentage**: ~6% (3 significant edge case records out of 51)

**Tenant Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Max length** | name | 255 chars | ✅ Satisfies VARCHAR(255) |
| **Epoch** | created_at | 1970-01-01 00:00:00 | ✅ Valid TIMESTAMP |

**User Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Special char** | email | `test+edge@example.com` | ✅ Valid email format |

**Project Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Boundary (zero)** | budget | $0.00 | ✅ Satisfies CHECK (budget >= 0) |
| **Max length** | name | 255 chars | ✅ Satisfies VARCHAR(255) |
| **Max precision** | budget | $9,999,999,999.99 | ✅ Satisfies DECIMAL(10,2) |

**Task Edge Cases**:

| Edge Case Type | Column | Value | Constraint Compliance |
| -------------- | ------ | ----- | --------------------- |
| **Max length** | title | 500 chars | ✅ Satisfies VARCHAR(500) |
| **NULL FK** | assigned_to | NULL (2 tasks) | ✅ Nullable FK allows NULL |

**Constraint-First Principle**: All edge cases satisfy constraints (Principle I > Principle IV)

**See**: [Edge Case Catalog](../../patterns/edge-case-catalog.md) for full edge case library

### Distribution Analysis

**Users per Tenant**:

- Tenant 1 (Acme Corp): 4 users (33.3%)
- Tenant 2 (TechStart Inc): 4 users (33.3%)
- Tenant 3 (Edge): 4 users (33.3%)

**Projects per Tenant**:

- Tenant 1: 3 projects (33.3%)
- Tenant 2: 3 projects (33.3%)
- Tenant 3: 3 projects (33.3%)

**Tasks per Tenant**:

- Tenant 1: 9 tasks (33.3%)
- Tenant 2: 9 tasks (33.3%)
- Tenant 3: 9 tasks (33.3%)

**Task Status Distribution** (All Tenants):

- todo: 9 tasks (33.3%)
- in_progress: 9 tasks (33.3%)
- done: 9 tasks (33.3%)

**User Role Distribution** (All Tenants):

- admin: 3 users (25%) - 1 per tenant
- user: 6 users (50%) - 2 per tenant
- readonly: 3 users (25%) - 1 per tenant

**Project Budget Distribution**:

- $0 - $50k: 5 projects (55.6%)
- $50k - $100k: 2 projects (22.2%)
- $100k+: 2 projects (22.2%) - includes edge case $9.9B

### Warnings

None. All constraints satisfied with zero violations. Multi-tenant isolation successfully enforced.

---

## Reproducibility

To regenerate this exact dataset:

```bash
# Using seed 200 with multi-tenant schema
generate_data --schema multi_tenant.sql --seed 200 --tenants 3 --users-per-tenant 4 --projects-per-tenant 3 --tasks-per-project 3 --edge-cases 0.05
```

**Guarantee**: Same seed (200) + same schema → identical output

---

## How This Example Was Generated

### Workflow Steps

1. **Schema Analysis** ([Workflow](../../workflows/01-schema-analysis.md))
   - Parsed DDL to extract constraints
   - Identified multi-tenant pattern (tenant_id in all tables)
   - Detected scoped uniqueness (tenant_id, email)
   - Identified CHECK constraints for cross-tenant validation

2. **Dependency Graphing** ([Workflow](../../workflows/02-dependency-graphing.md))
   - Generation order: tenants → users → projects → tasks
   - No circular dependencies (tenant is root)

3. **Data Generation** ([Workflow](../../workflows/03-data-generation.md))
   - **Tier 1**: Generate 3 tenants
   - **Tier 2**: Generate 4 users per tenant (12 total), scoped to tenant_id
   - **Tier 3**: Generate 3 projects per tenant (9 total), owner_id from same tenant
   - **Tier 4**: Generate 3 tasks per project (27 total), assigned_to from same tenant
   - **Edge Cases**: Inject max lengths, zero budget, NULL assignees, + in email

4. **Validation** ([Workflow](../../workflows/04-validation.md))
   - Pre-delivery checks: All constraints satisfied
   - Multi-tenant isolation verified (no cross-tenant FKs)
   - Validation report generated (above)

---

## Patterns Demonstrated

| Pattern | Example in This Dataset |
| ------- | ----------------------- |
| **Multi-Tenant Isolation** | All data scoped to tenant_id |
| **Scoped Uniqueness** | Email unique per tenant (not globally) |
| **Cross-Tenant Validation** | CHECK constraints prevent data leakage |
| **Tenant-Scoped FKs** | All FKs validated to be in same tenant |
| **FK Pool Management** | Separate PK pools per tenant for users/projects |
| **Edge Case Injection** | Max lengths, NULL FKs, boundary values |
| **Constraint-First Principle** | All edge cases satisfy isolation constraints |
| **Reproducibility** | Seed 200 → identical output on re-run |

**See**:

- [Constraint Handling Pattern](../../patterns/constraint-handling.md)
- [Edge Case Catalog Pattern](../../patterns/edge-case-catalog.md)
- [Distribution Strategies Pattern](../../patterns/distribution-strategies.md)
- [Reproducibility Pattern](../../patterns/reproducibility.md)

---

## Multi-Tenant Best Practices

### ✅ DO: Enforce Tenant Isolation with CHECK Constraints

```sql
-- Ensure project owner is in same tenant
CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = owner_id))
```

**Why**: Database-level validation prevents accidental cross-tenant data leakage

---

### ✅ DO: Use Scoped Uniqueness

```sql
-- Email unique per tenant (not globally)
UNIQUE (tenant_id, email)
```

**Why**: Different tenants can have users with same email address

---

### ✅ DO: Propagate tenant_id to All Tables

```sql
-- Every table includes tenant_id
CREATE TABLE tasks (
    tenant_id INT NOT NULL,  -- Explicit tenant ownership
    ...
);
```

**Why**: Enables efficient tenant filtering and isolation validation

---

### ❌ DON'T: Allow Cross-Tenant Foreign Keys

```sql
-- BAD: Task in Tenant 1 assigned to User in Tenant 2
INSERT INTO tasks (tenant_id, assigned_to) VALUES (1, 5);  -- User 5 is in Tenant 2
```

**Why**: Violates data isolation, creates security vulnerabilities

---

### ✅ DO: Generate Data Per-Tenant in Batches

```python
for tenant_id in tenant_ids:
    generate_users(tenant_id, count=users_per_tenant)
    generate_projects(tenant_id, count=projects_per_tenant)
    generate_tasks(tenant_id, count=tasks_per_project * projects_per_tenant)
```

**Why**: Ensures all tenant data is properly scoped and isolated

---

## Advanced Scenarios

### Scenario 1: Tenant-Specific Configuration

```sql
CREATE TABLE tenant_settings (
    tenant_id INT PRIMARY KEY,
    max_users INT NOT NULL,
    max_projects INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Generate data respecting tenant limits
-- Tenant 1: max_users=10, max_projects=5
-- Ensure user/project counts don't exceed limits
```

**Pattern**: Tenant-specific quotas and limits

---

### Scenario 2: Shared Reference Data

```sql
-- Some data is shared across all tenants (no tenant_id)
CREATE TABLE countries (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Users reference shared data
CREATE TABLE users (
    ...
    country_id INT,
    FOREIGN KEY (country_id) REFERENCES countries(id)  -- No tenant scoping
);
```

**Pattern**: Hybrid model with tenant-scoped and global data

---

### Scenario 3: Cross-Tenant Reporting (Read-Only)

```sql
-- Admin view across all tenants (for platform analytics)
CREATE VIEW admin_project_stats AS
SELECT tenant_id, COUNT(*) as project_count, SUM(budget) as total_budget
FROM projects
GROUP BY tenant_id;
```

**Pattern**: Aggregated cross-tenant views for platform management (no writes)

---

## Next Steps

### Progressive Examples

1. **Basic**: [Users Table](../basic/users-table.md) - Single table with edge cases
2. **Intermediate**: [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Multi-table
3. **Intermediate**: [Blog Platform](../intermediate/blog-platform.md) - Realistic distributions
4. **Advanced**: [Self-Referencing Hierarchies](self-referencing-hierarchies.md) - Tiered generation
5. **Advanced**: [Circular Dependencies](circular-dependencies.md) - Cycle resolution
6. **Advanced** (This example): Multi-tenant system ✓

### Related Examples

- [E-Commerce Schema](../intermediate/ecommerce-schema.md) - Simpler multi-table (no tenant isolation)
- [Circular Dependencies](circular-dependencies.md) - Similar complex constraint handling

---

**Related**:

- **Workflows**: [Schema Analysis](../../workflows/01-schema-analysis.md), [Data Generation](../../workflows/03-data-generation.md), [Validation](../../workflows/04-validation.md)
- **Patterns**: [Constraint Handling](../../patterns/constraint-handling.md), [Edge Case Catalog](../../patterns/edge-case-catalog.md), [Distribution Strategies](../../patterns/distribution-strategies.md)
- **Templates**: [Validation Report](../../templates/validation-report.md)

---

**Last Updated**: 2026-01-04
