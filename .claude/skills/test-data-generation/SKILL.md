# Test Data Generation Skill

**Version**: 1.0.0
**Author**: Claude Code Skill Framework
**Description**: Generate realistic, constraint-valid test data for relational databases
**Tags**: #testing #data-generation #database #sql #constraints

---

## Overview

This skill teaches Claude how to generate realistic, constraint-valid test data for relational databases. When users request test data, Claude analyzes the database schema, generates data that respects all constraints (primary keys, foreign keys, unique, NOT NULL, check constraints), validates the output, and delivers SQL/JSON/CSV files with a validation report proving 100% constraint satisfaction.

**Core Capabilities**:
- ✅ 100% database constraint compliance (primary keys, foreign keys, unique, NOT NULL, check constraints, data types)
- ✅ Production-like data patterns (realistic names, addresses, emails, phone numbers, temporal patterns)
- ✅ Referential integrity maintenance (topological generation: parent entities before children)
- ✅ Edge case coverage (boundary values, special characters, min/max lengths at configurable percentage)
- ✅ Pre-delivery validation with comprehensive validation report
- ✅ Multi-format export (SQL INSERT, JSON array, CSV) with consistency guarantee

---

## Activation Patterns

Claude **automatically recognizes** these request patterns and activates this skill:

- "Generate test data for [database/table/schema]"
- "I need sample data with [X] records"
- "Create realistic test data for testing [feature]"
- "Generate SQL/JSON/CSV fixtures for [purpose]"
- "I need test data that respects [constraints/relationships]"
- "Create edge case data for [entity]"
- "Generate [number] users/products/orders with relationships"

**No explicit slash command needed** - just describe your data generation need naturally.

---

## Quick Start

### Minimal Example (30 seconds)

**You Provide** (schema):
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT CHECK (age >= 18)
);
```

**You Say**: "Generate 10 users for this schema"

**Claude Delivers**:

1. **Generated SQL** (`users.sql`):
```sql
-- Validation Report: 10 users generated, seed=12345, edge cases=5%
INSERT INTO users (id, email, age) VALUES
  (1, 'sarah.chen@example.com', 34),
  (2, 'james.wilson@example.com', 28),
  (3, 'maria.garcia@example.com', 45),
  (4, 'robert.johnson@example.com', 52),
  (5, 'linda.martinez@example.com', 29),
  (6, 'michael.brown@example.com', 41),
  (7, 'jennifer.davis@example.com', 36),
  (8, 'william.miller@example.com', 38),
  (9, 'edge+case@example.com', 18),  -- Edge: min age
  (10, 'final.user@example.com', 30);

-- Validation: ✓ All emails unique (10/10)
-- Validation: ✓ All ages >= 18 (10/10)
-- Validation: ✓ No NULL values in required fields (10/10)
```

2. **Validation Report** (confirms 100% constraint satisfaction)

---

## Core Workflows

Follow these workflows in order when generating test data:

1. **[Schema Analysis](workflows/01-schema-analysis.md)**: Parse SQL DDL, extract all constraints (PK, FK, unique, NOT NULL, check, data types)
2. **[Dependency Graphing](workflows/02-dependency-graphing.md)**: Build entity dependency graph from foreign keys, perform topological sort for generation order
3. **[Data Generation](workflows/03-data-generation.md)**: Generate data parent-before-children, satisfy constraints, handle self-referencing FKs
4. **[Validation](workflows/04-validation.md)**: Pre-delivery validation checklist ensuring 100% constraint satisfaction
5. **[Export Formats](workflows/05-export-formats.md)**: Export to SQL INSERT, JSON array, or CSV with consistency validation

---

## Pattern Catalog

Reusable patterns for common data generation scenarios:

### Constraint Handling
- **[Constraint Handling](patterns/constraint-handling.md)**: How to handle each constraint type (PK, FK, unique, NOT NULL, check, types, cascade semantics)
- **[Reproducibility](patterns/reproducibility.md)**: Seed initialization for deterministic generation

### Data Quality
- **[Distribution Strategies](patterns/distribution-strategies.md)**: Zipf (popularity), normal (measurements), uniform (default)
- **[Locale Patterns](patterns/locale-patterns.md)**: US English addresses, phone numbers, names (with fallback strategy)
- **[Edge Case Catalog](patterns/edge-case-catalog.md)**: Type-specific boundary values (VARCHAR, INT, DATE, DECIMAL, BOOLEAN)

---

## Examples by Complexity

### Basic (Single-Table, Simple Constraints)
- **[Users Table](examples/basic/users-table.md)**: PK, unique email, NOT NULL name, check constraint (age >= 18)
- **[Products Table](examples/basic/products-table.md)**: PK, unique SKU, check constraint (price >= 0), NOT NULL fields

### Intermediate (Multi-Table, Foreign Key Relationships)
- **[E-Commerce Schema](examples/intermediate/ecommerce-schema.md)**: Users, products, orders, order_items with FK relationships and topological generation
- **[Blog Platform](examples/intermediate/blog-platform.md)**: Users, posts, comments, tags with realistic temporal patterns

### Advanced (Complex Relationships, Edge Cases)
- **[Self-Referencing Hierarchies](examples/advanced/self-referencing-hierarchies.md)**: Employee.managerId → Employee.id with tiered generation
- **[Circular Dependencies](examples/advanced/circular-dependencies.md)**: Department ↔ Employee circular FKs with resolution strategy
- **[Multi-Tenant System](examples/advanced/multi-tenant-system.md)**: Complex schema with tenant isolation and edge cases

---

## Output Templates

Standard formats for generated data:

- **[Validation Report](templates/validation-report.md)**: Required structure for pre-delivery validation documentation
- **[SQL INSERT Format](templates/sql-insert-format.md)**: SQL syntax, escaping rules, comment annotations
- **[JSON Export Format](templates/json-export-format.md)**: JSON array structure with nesting for relationships
- **[CSV Export Format](templates/csv-export-format.md)**: Header row format, quoting/escaping rules

---

## Guidelines

Quality standards and troubleshooting:

- **[Constitution Alignment](guidelines/constitution-alignment.md)**: How this skill enforces the 5 core principles (constraint compliance, production-like patterns, referential integrity, edge cases, validation)
- **[Troubleshooting](guidelines/troubleshooting.md)**: Common issues and solutions (schema parsing errors, constraint conflicts, generation failures, validation failures)
- **[Common Pitfalls](guidelines/common-pitfalls.md)**: Anti-patterns to avoid when generating test data

---

## Required Inputs

Claude will request/clarify these inputs before generating data:

1. **Schema Definition** (REQUIRED): SQL DDL, JSON schema, or ORM model definitions
2. **Volume** (REQUIRED): Number of records per entity/table
3. **Output Format** (DEFAULT: SQL): SQL, JSON, CSV, or multiple formats
4. **Seed** (OPTIONAL): For reproducible generation
5. **Edge Case Percentage** (DEFAULT: 5%): Percentage of records that should be edge cases
6. **Locale** (DEFAULT: US English): For realistic pattern generation
7. **Distribution Types** (DEFAULT: Uniform): For applicable fields (Zipf for popularity, normal for measurements)
8. **Custom Constraints** (OPTIONAL): Application-level business rules beyond database constraints
9. **Custom Value Generators** (OPTIONAL): User-provided patterns for domain-specific fields (e.g., "For SKU, use format ABC-####-XX")

---

## Expected Outputs

Claude delivers these artifacts:

1. **Generated Data File(s)**: In requested format(s), properly formatted and escaped
2. **Validation Report**: Documenting:
   - Constraint satisfaction checks (all passed)
   - Edge case coverage statistics
   - Distribution analysis (if applicable)
   - Record counts per entity
   - Generation metadata (schema version, seed, parameters)
3. **Generation Summary**: Human-readable explanation of what was generated and any notable decisions made

---

## Constitutional Principles

This skill enforces strict quality gates per the [constitution](guidelines/constitution-alignment.md):

- ✅ **I. Database Constraint Compliance (NON-NEGOTIABLE)**: All constraints satisfied, zero violations
- ✅ **II. Production-Like Data Patterns**: Realistic names, addresses, emails, temporal patterns, distributions
- ✅ **III. Referential Integrity Maintenance**: All foreign keys resolve, no orphans, topological generation
- ✅ **IV. Edge Case Coverage**: Boundary values included at configurable percentage (default 5%)
- ✅ **V. Validation Before Delivery (NON-NEGOTIABLE)**: Pre-delivery validation report mandatory

**Data that fails validation is never delivered.**

---

## Next Steps

1. **Explore workflows**: Start with [Schema Analysis](workflows/01-schema-analysis.md) to understand how Claude parses schemas
2. **Review examples**: Check [Users Table](examples/basic/users-table.md) for a simple working example
3. **Understand patterns**: Read [Constraint Handling](patterns/constraint-handling.md) to see how constraints are satisfied
4. **Try it**: Provide a schema and request generation to see the skill in action

---

**Last Updated**: 2026-01-04
**License**: Open for use with Claude Code
