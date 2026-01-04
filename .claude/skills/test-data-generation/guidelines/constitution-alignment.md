# Constitution Alignment: Test Data Generation Skill

**Purpose**: Document how this skill enforces the 5 core constitutional principles

**Constitution Version**: 1.0.0

---

## Overview

The Test Data Generation Skill is governed by a constitution defining 5 **NON-NEGOTIABLE** core principles. This document explains how each principle is enforced through skill workflows, patterns, and validation gates.

---

## Principle I: Database Constraint Compliance (NON-NEGOTIABLE)

> Generated data MUST respect ALL database constraints without exception

### Constraint Types Enforced

1. **Primary Keys**: Unique, non-null, correctly typed
   - **Enforcement**: Sequential ID generation or UUID generation ensures uniqueness
   - **Workflow**: [Schema Analysis](../workflows/01-schema-analysis.md) extracts PK constraints
   - **Pattern**: [Constraint Handling](../patterns/constraint-handling.md) documents PK generation strategies

2. **Foreign Keys**: Valid references to existing parent records
   - **Enforcement**: [Dependency Graphing](../workflows/02-dependency-graphing.md) performs topological sort
   - **Workflow**: [Data Generation](../workflows/03-data-generation.md) generates parent records before children
   - **Pattern**: FK values selected from pool of existing parent IDs

3. **Unique Constraints**: No duplicate values in constrained columns
   - **Enforcement**: Track used values in set, check before generating new value
   - **Pattern**: [Constraint Handling](../patterns/constraint-handling.md) - unique value tracking

4. **NOT NULL Constraints**: No missing required values
   - **Enforcement**: Always generate value for NOT NULL columns, no skip logic
   - **Validation**: [Validation workflow](../workflows/04-validation.md) checks for nulls in required fields

5. **Check Constraints**: All conditions satisfied
   - **Enforcement**: Parse check condition (e.g., `age >= 18`), generate values satisfying condition
   - **Conflict Resolution**: If edge case conflicts with check constraint, skip edge case (constraint wins)

6. **Data Type Constraints**: Correct types, lengths, and formats
   - **Enforcement**: Match precision/scale/length exactly (e.g., VARCHAR(255) generates strings ≤ 255 chars)

### Validation Gate

**Pre-Delivery Validation** ([Validation workflow](../workflows/04-validation.md)) verifies:
- ✓ Schema conformance: All tables and columns match schema
- ✓ Primary keys: All PKs unique and non-null
- ✓ Foreign keys: All FKs resolve to existing parent records
- ✓ Unique constraints: No duplicates in constrained columns
- ✓ NOT NULL: No nulls in required fields
- ✓ Check constraints: All conditions satisfied
- ✓ Data types: All values match declared types

**Gate Result**: If ANY validation fails, data is NOT delivered. User receives error report.

---

## Principle II: Production-Like Data Patterns

> Data MUST mirror real-world characteristics and distributions

### Realistic Patterns Enforced

1. **Names**: Drawn from realistic name distributions (not random character sequences)
   - **Pattern**: [Locale Patterns](../patterns/locale-patterns.md) - US English names
   - **Examples**: "Sarah Chen", "James Williams" (not "abc123" or "User1")

2. **Addresses**: Locale-appropriate formatting
   - **US English**: Valid state codes, ZIP codes match city patterns
   - **Pattern**: [Locale Patterns](../patterns/locale-patterns.md)
   - **Format**: "123 Main St, San Francisco, CA 94102"

3. **Emails**: Realistic domains and formatting
   - **Pattern**: `firstname.lastname@example.com` or `firstname.lastname@realistic-domain.com`
   - **NOT**: `user1@test.com` or `abc@abc.com`

4. **Phone Numbers**: Locale-appropriate formatting
   - **US English**: `(415) 555-1234` format
   - **Pattern**: [Locale Patterns](../patterns/locale-patterns.md)

5. **Temporal Patterns**: Realistic date/time distributions
   - **Business logic**: More orders on weekdays than weekends
   - **Pattern**: [Data Generation](../workflows/03-data-generation.md) - temporal pattern section

6. **Statistical Distributions**: Representative distributions
   - **Zipf**: Product popularity (20% of products → 80% of orders)
   - **Normal**: Measurements, quantities with natural variance
   - **Uniform**: Default for fields without special distribution
   - **Pattern**: [Distribution Strategies](../patterns/distribution-strategies.md)

### Validation

**Distribution Analysis** in validation report verifies:
- Zipf distribution: 20% of entities account for ~80% of references (±10% tolerance)
- Locale formats: 95%+ format correctness (valid state codes, ZIP patterns, phone formats)

---

## Principle III: Referential Integrity Maintenance

> All relationships between entities MUST be internally consistent

### Integrity Rules Enforced

1. **Foreign Key Relationships**: Properly maintained
   - **Enforcement**: [Dependency Graphing](../workflows/02-dependency-graphing.md) ensures parent-before-child generation
   - **Validation**: [Validation workflow](../workflows/04-validation.md) - referential integrity audit

2. **No Orphaned Records**: Prohibited unless explicitly specified
   - **Enforcement**: FK values selected from pool of existing parent IDs
   - **Exception**: Nullable FKs may have NULL (explicitly allowed orphans)

3. **Cascade Semantics**: Respected
   - **ON DELETE CASCADE**: Generate child records that would survive parent deletion
   - **ON DELETE SET NULL**: Allow nullable FKs to be set NULL
   - **ON UPDATE CASCADE**: Maintain FK references when parent PK changes
   - **Pattern**: [Constraint Handling](../patterns/constraint-handling.md) - cascade semantics section

4. **Self-Referencing Relationships**: Valid hierarchies
   - **Tiered Generation**: First N records have NULL FK, subsequent records reference earlier records
   - **Example**: Employee.managerId → Employee.id creates realistic organizational hierarchy
   - **Advanced**: [Self-Referencing Hierarchies example](../examples/advanced/self-referencing-hierarchies.md)

5. **Circular Dependencies**: Resolved
   - **Strategy**: Break cycle by generating one entity first with NULL, then other entity, then update
   - **Advanced**: [Circular Dependencies example](../examples/advanced/circular-dependencies.md)

### Validation Gate

**Referential Integrity Audit** checks:
- ✓ Orphan check: No orphaned records (all FKs resolve)
- ✓ Cascade semantics: Relationships respect cascade rules
- ✓ Hierarchy validity: Self-referencing structures form valid trees/DAGs

---

## Principle IV: Edge Case Coverage

> Generated datasets MUST include boundary conditions and edge cases

### Edge Case Types

1. **String Edge Cases** (VARCHAR, TEXT):
   - Min length: 0 (empty string)
   - Max length: Full constraint length (e.g., VARCHAR(255) → 255-char string)
   - Special characters: `+`, `-`, `@`, `'`, `"`, Unicode
   - **Pattern**: [Edge Case Catalog](../patterns/edge-case-catalog.md)

2. **Numeric Edge Cases** (INT, DECIMAL):
   - Zero: `0`
   - Negative: `-1`, `-100`
   - Max value: Maximum for data type (e.g., INT max = 2,147,483,647)
   - Min precision: `0.00` for DECIMAL
   - **Pattern**: [Edge Case Catalog](../patterns/edge-case-catalog.md)

3. **Date/Time Edge Cases** (DATE, TIMESTAMP):
   - Epoch: `1970-01-01 00:00:00`
   - 2038 problem: `2038-01-19` (32-bit overflow boundary)
   - Far future: `2099-12-31`
   - **Pattern**: [Edge Case Catalog](../patterns/edge-case-catalog.md)

4. **NULL Edge Cases**: For optional fields (nullable columns)
   - Include NULL values in edge case records

### Configuration

- **Default**: 5% of records are edge cases
- **Configurable**: User can specify edge case percentage (e.g., 10%)
- **Distribution**: Edge cases distributed throughout dataset (not grouped at end)

### Constraint-First Principle

**CRITICAL**: If edge case violates constraint, **skip edge case** (constraint wins)
- Example: `age >= 18` check constraint → cannot generate `age = 0` edge case
- **Resolution**: Skip conflicting edge case, document in validation report
- **Pattern**: [Data Generation](../workflows/03-data-generation.md) - edge case injection section

### Validation Gate

**Edge Case Coverage** verification:
- ✓ Target percentage achieved (±2% tolerance)
- ✓ Type-specific edge cases included (VARCHAR min/max, DATE boundaries, etc.)
- ✓ Skipped edge cases documented (if constraint conflicts)

---

## Principle V: Validation Before Delivery (NON-NEGOTIABLE)

> All generated data MUST be validated prior to use

### Pre-Delivery Validation Checklist

**Mandatory Steps** ([Validation workflow](../workflows/04-validation.md)):

1. **Schema Conformance**:
   - All tables exist in schema
   - All columns exist with correct types
   - No extra/missing tables or columns

2. **Constraint Satisfaction**:
   - Primary keys: All unique and non-null
   - Foreign keys: All resolve to existing parent records
   - Unique constraints: No duplicates
   - NOT NULL: No nulls in required fields
   - Check constraints: All conditions satisfied
   - Data types: All values match declared types

3. **Referential Integrity Audit**:
   - No orphaned records (unless nullable FKs with NULL)
   - Cascade semantics respected
   - Hierarchies form valid structures

4. **Statistical Sanity Checks**:
   - Distributions within expected ranges (±10% tolerance)
   - Edge case percentage within tolerance (±2%)

5. **Required Field Completeness**:
   - No unexpected NULLs
   - All NOT NULL fields populated

6. **Custom Business Rule Validation** (if specified):
   - User-provided validators applied
   - Domain-specific rules enforced

### Validation Report Template

**Required Structure** ([Validation Report template](../templates/validation-report.md)):

- Generation metadata (schema, seed, volume, edge case %, locale, distributions, timestamp)
- Constraint satisfaction checks (✓ or ✗ for each check with stats)
- Referential integrity audit (orphan check, cascade semantics, hierarchy validity)
- Edge case coverage (target vs actual, types included, skipped cases)
- Distribution analysis (if configured)
- Warnings & notes

### Delivery Gate

**ONLY data passing ALL validation steps proceeds to output.**

If validation fails:
- **NO DATA DELIVERED**
- User receives validation report with failure details
- User receives clear error message explaining what failed and why

---

## Compliance Summary

| Principle | Enforcement Mechanism | Validation Gate | Consequence of Violation |
|-----------|----------------------|-----------------|--------------------------|
| I. Constraint Compliance | Schema analysis + constraint handling patterns + topological sort | Pre-delivery constraint satisfaction check | **BLOCK**: Data not delivered |
| II. Production-Like Patterns | Locale patterns + distribution strategies + realistic value generation | Distribution analysis in validation report | **WARN**: Note deviations in report |
| III. Referential Integrity | Dependency graphing + parent-before-child generation + FK pool selection | Referential integrity audit | **BLOCK**: Data not delivered |
| IV. Edge Case Coverage | Edge case catalog + configurable percentage + constraint-first principle | Edge case coverage verification | **WARN**: Note percentage deviation |
| V. Validation Before Delivery | Mandatory pre-delivery validation workflow | All validation checks MUST pass | **BLOCK**: Data not delivered if any check fails |

**NON-NEGOTIABLE Principles**: I, V (data NEVER delivered if violated)

**MUST Principles**: II, III, IV (violations require documented justification or corrective action)

---

## Examples Demonstrating Constitutional Compliance

All examples in this skill include validation reports proving constitutional compliance:

- **[Users Table](../examples/basic/users-table.md)**: Demonstrates Principle I (constraints) and Principle V (validation)
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Demonstrates Principles I, II, III, V
- **[Self-Referencing Hierarchies](../examples/advanced/self-referencing-hierarchies.md)**: Demonstrates Principles I, III (referential integrity with self-references), V

---

**Last Updated**: 2026-01-04
