# Implementation Plan: Test Data Generation Skill

**Branch**: `001-test-data-generation` | **Date**: 2026-01-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-test-data-generation/spec.md`

## Summary

Create a Claude Code skill that teaches Claude how to generate realistic, constraint-valid test data for relational databases. The skill guides Claude through schema analysis, dependency graphing, topological data generation, validation, and multi-format export. Core focus: 100% database constraint compliance, production-like patterns, referential integrity, edge case coverage, and mandatory pre-delivery validation.

**Technical Approach**: Documentation-based skill using markdown files with examples, templates, and step-by-step workflows. No code execution required - Claude learns patterns through comprehensive examples and applies them interactively when users request data generation.

## Technical Context

**Language/Version**: N/A (Documentation skill - no code execution)
**Primary Dependencies**: N/A (Claude applies patterns directly in conversation)
**Storage**: Markdown files organized in skill directory structure
**Testing**: Example-based validation (good vs bad output examples documented)
**Target Platform**: Claude Code CLI (cross-platform)
**Project Type**: Documentation skill (structured markdown documentation)
**Performance Goals**: Claude should recognize data generation requests in <1s, begin generation workflow immediately
**Constraints**: Documentation must fit within Claude's context window when referenced; examples must be concise yet comprehensive
**Scale/Scope**: Single skill covering all relational database test data generation scenarios; ~10-15 markdown files; 50-100 documented examples

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Core Principles Compliance

**I. Database Constraint Compliance (NON-NEGOTIABLE)**
- ✅ **Status**: PASS - Skill explicitly teaches constraint-first generation
- **Evidence**: FR-001 through FR-006 mandate schema analysis and constraint satisfaction
- **Implementation**: SKILL.md includes constraint extraction workflow and validation gates

**II. Production-Like Data Patterns**
- ✅ **Status**: PASS - Skill teaches realistic pattern generation
- **Evidence**: FR-009, FR-010 require locale-appropriate data and configurable distributions
- **Implementation**: Examples section demonstrates Zipf, normal, uniform distributions

**III. Referential Integrity Maintenance**
- ✅ **Status**: PASS - Skill enforces topological generation
- **Evidence**: FR-005, FR-016, FR-017 mandate parent-before-child and relationship handling
- **Implementation**: Workflow steps include dependency graphing and tiered generation

**IV. Edge Case Coverage**
- ✅ **Status**: PASS - Skill requires integrated edge cases
- **Evidence**: FR-011 mandates configurable edge case percentage (default 5%)
- **Implementation**: Edge case catalog with type-specific boundaries documented

**V. Validation Before Delivery (NON-NEGOTIABLE)**
- ✅ **Status**: PASS - Skill mandates validation gate
- **Evidence**: FR-006, FR-007 require pre-delivery validation with documented report
- **Implementation**: Validation checklist workflow before any data delivery

### ✅ Data Quality Standards Compliance

**Reproducibility**
- ✅ **Status**: PASS
- **Evidence**: FR-008 requires seeding mechanism; SC-006, SC-015 mandate determinism

**Performance Targets**
- ✅ **Status**: PASS
- **Evidence**: SC-002 (1000 records in <5s), FR-018 (streaming for >100k records)

**Documentation Requirements**
- ✅ **Status**: PASS
- **Evidence**: FR-015 mandates generation metadata documentation

### ✅ Development Workflow Compliance

**Input Processing → Generation → Validation → Output**
- ✅ **Status**: PASS - All workflow stages documented in skill
- **Evidence**: "Teaching Goals" section maps to constitution workflow exactly

### Gate Result: ✅ ALL GATES PASS - Proceed to implementation

## Project Structure

### Documentation (this feature)

```text
specs/001-test-data-generation/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output - skill structure best practices
├── data-model.md        # Phase 1 output - skill file organization model
├── quickstart.md        # Phase 1 output - how to use the skill
├── contracts/           # Phase 1 output - skill file templates and schemas
│   ├── SKILL.md-template.md       # Template for main skill file
│   ├── example-schema.sql         # Sample database schema for examples
│   └── validation-report-schema.md # Structure for validation reports
└── checklists/          # Quality validation checklists (already exists)
    └── requirements.md
```

### Skill Files (repository root - skill deployment location)

**IMPORTANT**: This is a *documentation skill*, not traditional source code. The "implementation" is creating structured markdown documentation that Claude references during data generation tasks.

```text
.claude/
└── skills/
    └── test-data-generation/     # Skill root directory
        ├── SKILL.md              # Main skill file (Claude's primary reference)
        ├── workflows/            # Step-by-step generation workflows
        │   ├── 01-schema-analysis.md
        │   ├── 02-dependency-graphing.md
        │   ├── 03-data-generation.md
        │   ├── 04-validation.md
        │   └── 05-export-formats.md
        ├── examples/             # Comprehensive examples organized by complexity
        │   ├── basic/           # Simple single-table examples
        │   │   ├── users-table.md
        │   │   └── products-table.md
        │   ├── intermediate/    # Multi-table with relationships
        │   │   ├── ecommerce-schema.md
        │   │   └── blog-platform.md
        │   └── advanced/        # Complex scenarios
        │       ├── self-referencing-hierarchies.md
        │       ├── circular-dependencies.md
        │       └── multi-tenant-system.md
        ├── patterns/            # Reusable generation patterns
        │   ├── constraint-handling.md
        │   ├── edge-case-catalog.md
        │   ├── distribution-strategies.md
        │   └── locale-patterns.md
        ├── templates/           # Output templates
        │   ├── validation-report.md
        │   ├── sql-insert-format.md
        │   ├── json-export-format.md
        │   └── csv-export-format.md
        └── guidelines/          # Quality and compliance guidelines
            ├── constitution-alignment.md
            ├── troubleshooting.md
            └── common-pitfalls.md
```

**Structure Decision**: Documentation skill structure chosen because:
1. **No code execution needed**: Claude applies patterns directly in conversation
2. **Reference-based learning**: Claude reads examples and workflows, applies to user requests
3. **Scalability**: Easy to add new examples, patterns, workflows without code changes
4. **Maintainability**: Markdown files are human-readable and version-controllable
5. **Flexibility**: Users can extend with custom patterns/examples specific to their domains

## Complexity Tracking

> **No constitution violations** - This section is empty (required only for justified violations)

All complexity is inherent to the domain (database constraints, referential integrity, validation) and documented as necessary. No unnecessary abstractions or patterns added.

---

## Phase 0: Research & Skill Structure Design

**Goal**: Determine optimal skill file organization, content structure for SKILL.md, and example complexity progression.

### Research Tasks

1. **Skill Documentation Best Practices**
   - Research: How should Claude Code skills organize documentation for maximum effectiveness?
   - Research: What makes examples effective for LLM learning?
   - Research: How to structure progressive complexity (basic → intermediate → advanced)?

2. **Database Schema Parsing Strategies**
   - Research: Common SQL DDL patterns across databases (PostgreSQL, MySQL, SQLite)
   - Research: JSON Schema format for database models
   - Research: ORM model formats (SQLAlchemy, Django, Prisma, TypeORM)

3. **Test Data Generation Libraries & Patterns**
   - Research: Industry-standard test data libraries (Faker.js, Python Faker, etc.)
   - Research: Statistical distribution implementations (Zipf, normal, uniform)
   - Research: Edge case catalogs for common data types

4. **Validation Strategies**
   - Research: Database constraint validation approaches
   - Research: Referential integrity checking algorithms
   - Research: Statistical validation methods for distributions

### Research Output: `research.md`

Document findings structured as:

```markdown
# Research: Test Data Generation Skill Structure

## Decision: Skill File Organization
- **Chosen**: workflows/ + examples/ + patterns/ + templates/ + guidelines/
- **Rationale**: Separates procedural knowledge (workflows) from reference knowledge (examples, patterns)
- **Alternatives Considered**: Single SKILL.md file (rejected: too large), flat file structure (rejected: poor discoverability)

## Decision: SKILL.md Content Sections
- **Chosen**: Overview → Quick Start → Core Workflows → Pattern Reference → Examples → Troubleshooting
- **Rationale**: Follows learning progression from "what/when" to "how" to "examples"
- **Alternatives Considered**: Example-first (rejected: lacks context), workflow-only (rejected: missing quick reference)

## Decision: Example Complexity Progression
- **Chosen**: basic/ (single table, simple constraints) → intermediate/ (multi-table, FK relationships) → advanced/ (self-referencing, circular deps, edge cases)
- **Rationale**: Users start simple, graduate to complex; each level independently usable
- **Alternatives Considered**: Domain-based organization (rejected: hard to assess difficulty)

## Decision: Schema Format Support Priority
- **Chosen**: 1) SQL DDL (PostgreSQL), 2) JSON Schema, 3) ORM models (document common formats)
- **Rationale**: SQL DDL is universal; JSON Schema is standardized; ORM models vary but patterns similar
- **Alternatives Considered**: ORM-first (rejected: too many variants), database-specific DDL (rejected: limits portability)

## Decision: Validation Strategy
- **Chosen**: Pre-delivery checklist approach (schema conformance → constraints → integrity → distributions → business rules)
- **Rationale**: Sequential gates ensure completeness; each gate independently verifiable
- **Alternatives Considered**: Statistical sampling (rejected: may miss violations), post-generation only (rejected: violates constitution)

## Libraries & Tools Research
- **Faker.js / Python Faker**: Standard for realistic pattern generation (names, addresses, emails)
- **Zipf Distribution**: power-law for product popularity, user activity
- **Normal Distribution**: measurements, quantities with natural variance
- **Edge Case Catalog**: Documented per SQL data type (VARCHAR, INT, DATE, etc.)
```

---

## Phase 1: Design & Skill Content Creation

**Prerequisites**: `research.md` complete

### 1. Data Model (Skill File Organization)

**Output**: `data-model.md`

Document the skill file structure as a "data model":

```markdown
# Data Model: Test Data Generation Skill Files

## Entity: SKILL.md (Main Entry Point)

**Purpose**: Primary reference document Claude reads to understand skill capabilities and when to activate

**Attributes**:
- Skill name and description (1-2 sentences)
- Activation patterns (keywords/phrases that trigger skill usage)
- Quick start guide (minimal example)
- Core workflows overview (links to detailed workflows)
- Pattern catalog index (links to specific patterns)
- Example index (links organized by complexity)

**Relationships**:
- References → workflows/*.md (1-to-many)
- References → examples/*/*.md (1-to-many)
- References → patterns/*.md (1-to-many)
- References → templates/*.md (1-to-many)

**Validation Rules**:
- Must be <10,000 characters (context window constraint)
- Must include clear activation patterns
- Must link to at least one workflow

## Entity: Workflow File (workflows/*.md)

**Purpose**: Step-by-step procedural guidance for specific generation phases

**Attributes**:
- Workflow name
- Input requirements
- Output deliverables
- Sequential steps (numbered list)
- Decision points (conditional branches)
- Examples references (links to relevant examples)

**Relationships**:
- Referenced by → SKILL.md
- References → examples/*.md (illustrative examples for each step)
- References → patterns/*.md (specific patterns applied in steps)

**Validation Rules**:
- Steps must be actionable (start with verb)
- Must include at least one example reference
- Must specify inputs and outputs explicitly

## Entity: Example File (examples/*/*.md)

**Purpose**: Concrete demonstrations of generation for specific schemas

**Attributes**:
- Complexity level (basic/intermediate/advanced)
- Schema (SQL DDL or JSON Schema)
- Generation parameters (volume, seed, locale, edge case %)
- Generated output (SQL/JSON/CSV)
- Validation report
- Annotations explaining key decisions

**Relationships**:
- Organized in → examples/basic/, examples/intermediate/, examples/advanced/
- Referenced by → workflows/*.md (illustrative)
- Demonstrates → patterns/*.md (pattern application)

**Validation Rules**:
- Must include complete schema
- Must include complete generated output (not truncated)
- Must include validation report proving constraint compliance

## Entity: Pattern File (patterns/*.md)

**Purpose**: Reusable pattern documentation (how to handle specific scenarios)

**Attributes**:
- Pattern name
- When to use (trigger conditions)
- How to apply (algorithm/approach)
- Constraints to respect
- Examples (references to examples/*.md)

**Relationships**:
- Referenced by → workflows/*.md (applied during workflow execution)
- Demonstrated in → examples/*.md (concrete applications)

**Validation Rules**:
- Must include clear applicability criteria
- Must reference constitution principle alignment
- Must include at least one example reference

## Entity: Template File (templates/*.md)

**Purpose**: Output format specifications

**Attributes**:
- Format name (validation-report, sql-insert, json-export, csv-export)
- Structure specification
- Required fields
- Optional fields
- Formatting rules (escaping, quoting, etc.)

**Relationships**:
- Referenced by → workflows/05-export-formats.md
- Demonstrated in → examples/*.md (actual outputs)

**Validation Rules**:
- Must specify all required fields
- Must include formatting examples
- Must document edge cases (special characters, nulls, etc.)
```

### 2. Contracts (Skill File Templates & Schemas)

**Output**: `contracts/` directory with template files

Create contract specifications for key skill files:

**File**: `contracts/SKILL.md-template.md`

```markdown
# [Skill Name]

> Template for main SKILL.md file. Fill in bracketed placeholders.

## Overview

[1-2 sentence description of what this skill teaches Claude]

**Activation Patterns**:
- "[Keyword phrase 1]"
- "[Keyword phrase 2]"
- "[Keyword phrase 3]"

## Quick Start

[Minimal working example - 5-10 lines showing simplest use case]

## Core Workflows

1. **[Workflow 1 Name]**: [1 sentence description] → [Link to workflows/01-*.md]
2. **[Workflow 2 Name]**: [1 sentence description] → [Link to workflows/02-*.md]
[... up to 5 core workflows]

## Pattern Catalog

- **[Pattern Category 1]**: [Link to patterns/*-category1.md]
- **[Pattern Category 2]**: [Link to patterns/*-category2.md]
[... pattern categories]

## Examples by Complexity

### Basic
- [Example 1 Name] → [Link to examples/basic/example1.md]
- [Example 2 Name] → [Link to examples/basic/example2.md]

### Intermediate
- [Example 1 Name] → [Link to examples/intermediate/example1.md]

### Advanced
- [Example 1 Name] → [Link to examples/advanced/example1.md]

## Troubleshooting

Common issues and solutions → [Link to guidelines/troubleshooting.md]
```

**File**: `contracts/example-schema.sql`

```sql
-- Sample E-Commerce Database Schema
-- Demonstrates: Multi-table relationships, FK constraints, check constraints, unique constraints

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT CHECK (age >= 18),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) CHECK (price >= 0),
    stock INT CHECK (stock >= 0) DEFAULT 0,
    category VARCHAR(50) NOT NULL
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10, 2) CHECK (total >= 0),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) CHECK (unit_price >= 0)
);

-- Self-referencing hierarchy example
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_category_id INT REFERENCES categories(id)
);
```

**File**: `contracts/validation-report-schema.md`

```markdown
# Validation Report Schema

**Purpose**: Document structure for pre-delivery validation reports

## Required Sections

### 1. Generation Metadata
- **Schema Source**: [File path or description]
- **Schema Version**: [Version identifier if applicable]
- **Seed**: [Random seed used for reproducibility]
- **Volume**: [Records generated per table]
- **Edge Case Percentage**: [Configured percentage, e.g., 5%]
- **Locale**: [Locale used, e.g., "US English"]
- **Distribution Types**: [e.g., "Uniform (default), Zipf (product popularity)"]
- **Generation Timestamp**: [ISO 8601 timestamp]

### 2. Constraint Satisfaction Checks

Format: `✓` or `✗` followed by description and stats

- **Schema Conformance**: ✓ All tables and columns match schema (X/X tables, Y/Y columns)
- **Primary Keys**: ✓ All PKs unique and non-null (X/X records)
- **Foreign Keys**: ✓ All FKs resolve to existing parent records (X/X relationships)
- **Unique Constraints**: ✓ No duplicate values in constrained columns (X/X constraints)
- **NOT NULL Constraints**: ✓ No nulls in required fields (X/X fields)
- **Check Constraints**: ✓ All check conditions satisfied (X/X constraints)
- **Data Types**: ✓ All values match declared types (X/X fields)

### 3. Referential Integrity Audit

- **Orphan Check**: ✓ No orphaned records (X/X records have valid parents)
- **Cascade Semantics**: ✓ Relationships respect cascade rules
- **Hierarchy Validity**: ✓ Self-referencing structures form valid trees/DAGs

### 4. Edge Case Coverage

- **Target Percentage**: 5% (50 records out of 1000)
- **Actual Coverage**: 5.0% (50/1000)
- **Edge Cases Included**:
  - Min/max string lengths: 10 records
  - Boundary dates (epoch, 2038): 8 records
  - Special characters: 12 records
  - Zero/negative values: 10 records
  - NULL optionals: 10 records
- **Skipped Edge Cases** (constraint conflicts): [List any skipped, or "None"]

### 5. Distribution Analysis (if configured)

- **Distribution Type**: Zipf (product references in orders)
- **Validation**: 20% of products account for 78% of orders (target: 80%, within 10% tolerance)

### 6. Warnings & Notes

- [Any warnings, e.g., "Locale 'Finnish' not supported, fell back to US English"]
- [Any notable decisions, e.g., "Large dataset (150k records) used streaming mode"]

## Example Report

```
VALIDATION REPORT
Generated: 2026-01-04T10:30:00Z

=== Generation Metadata ===
Schema Source: ecommerce-schema.sql
Seed: 42
Volume: 1000 users, 2500 orders, 5000 order_items, 200 products
Edge Case Percentage: 5%
Locale: US English
Distributions: Uniform (default), Zipf (product popularity in orders)

=== Constraint Satisfaction ===
✓ Schema Conformance: All tables and columns match schema (4/4 tables, 18/18 columns)
✓ Primary Keys: All PKs unique and non-null (8700/8700 records)
✓ Foreign Keys: All FKs resolve (7500/7500 relationships)
✓ Unique Constraints: No duplicates (1000/1000 emails, 200/200 SKUs)
✓ NOT NULL Constraints: No nulls in required fields (20/20 fields)
✓ Check Constraints: All conditions satisfied (6/6 constraints)
✓ Data Types: All values match declared types (50/50 fields)

=== Referential Integrity ===
✓ Orphan Check: No orphaned records (7500/7500 records have valid parents)
✓ Cascade Semantics: Relationships respect ON DELETE CASCADE
✓ Hierarchy Validity: N/A (no self-referencing in this schema)

=== Edge Case Coverage ===
Target: 5% | Actual: 5.1% (444/8700 total records)
✓ Min/max lengths (VARCHAR fields): 87 records
✓ Boundary dates (1970-01-01, 2038-01-19): 43 records
✓ Special characters in strings: 102 records
✓ Zero/boundary numeric values: 89 records
✓ NULL in optional fields: 123 records
Skipped: None

=== Distribution Analysis ===
✓ Zipf (product popularity): 20% of products → 79% of orders (target: 80%, ±10% OK)

=== Warnings ===
None

VALIDATION RESULT: ✓ PASS - All checks successful, data ready for delivery
```
```

### 3. Quickstart Guide

**Output**: `quickstart.md`

```markdown
# Quick Start: Using the Test Data Generation Skill

## What This Skill Does

Teaches Claude how to generate realistic, constraint-valid test data for relational databases. Claude analyzes your schema, generates data that respects all constraints, validates the output, and delivers SQL/JSON/CSV with a validation report.

## When Claude Uses This Skill

Claude automatically recognizes these patterns and activates the skill:
- "Generate test data for [database/schema]"
- "I need sample data with [X] records"
- "Create realistic test data for testing [feature]"
- "Generate SQL/JSON/CSV fixtures"

No explicit command needed - just describe your data generation need naturally.

## Minimal Example (30 seconds)

### You Provide

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INT CHECK (age >= 18)
);
```

### You Say

"Generate 10 users for this schema"

### Claude Delivers

1. **Generated SQL** (`users.sql`):
```sql
-- Validation Report: 10 users generated, seed=12345, edge cases=5%
INSERT INTO users (id, email, age) VALUES
  (1, 'sarah.chen@example.com', 34),
  (2, 'james.wilson@example.com', 28),
  (3, 'maria.garcia@example.com', 45),
  -- ... 5 more realistic records ...
  (9, 'edge+case@example.com', 18),  -- Edge: min age
  (10, 'final@example.com', 30);

-- Validation: ✓ All emails unique (10/10)
-- Validation: ✓ All ages >= 18 (10/10)
```

2. **Validation Report** (confirms 100% constraint satisfaction)

## Next Steps

- **More complex schemas**: See [examples/intermediate/ecommerce-schema.md](examples/intermediate/ecommerce-schema.md)
- **Understand workflows**: Start with [workflows/01-schema-analysis.md](workflows/01-schema-analysis.md)
- **Customize patterns**: Check [patterns/distribution-strategies.md](patterns/distribution-strategies.md)

## Required Inputs

Claude will ask for these if not provided:

1. **Schema** (REQUIRED): SQL DDL, JSON Schema, or ORM model
2. **Volume** (REQUIRED): Number of records per table
3. **Output Format** (default: SQL): SQL, JSON, CSV, or multiple
4. **Seed** (optional): For reproducible generation
5. **Edge Case %** (default: 5%): Percentage of edge case records
6. **Locale** (default: US English): For realistic names/addresses
7. **Distributions** (default: Uniform): Special distributions if needed

## What You Get

1. **Generated Data File(s)**: In requested format(s), ready to load
2. **Validation Report**: Proof that all constraints satisfied
3. **Generation Summary**: Explanation of what was generated and key decisions

## Constitution Alignment

This skill enforces strict quality gates:
- ✅ 100% database constraint compliance (NON-NEGOTIABLE)
- ✅ Referential integrity maintained (parent records generated before children)
- ✅ Edge cases included (configurable %, default 5%)
- ✅ Validation before delivery (MANDATORY - no data without validation report)

Data that fails validation is never delivered.
```

---

## Phase 2: Implementation Planning Complete

**Note**: Actual skill file creation (SKILL.md, workflows/*.md, examples/*.md, etc.) is NOT part of `/speckit.plan`. That is done in `/speckit.tasks` and implementation phases.

**Deliverables from this planning phase**:
1. ✅ `plan.md` (this file) - Complete implementation plan
2. ✅ `research.md` - Skill structure research findings (to be created)
3. ✅ `data-model.md` - Skill file organization model (to be created)
4. ✅ `quickstart.md` - Quick start guide (to be created)
5. ✅ `contracts/` - Template files and schemas (to be created)

**Next Command**: `/speckit.tasks` to generate the task breakdown for actually creating all skill files

---

## Summary

This plan structures the test data generation skill as **documentation skill** rather than traditional software:

### Key Architectural Decisions

1. **Skill Structure**: `SKILL.md` (main entry) + `workflows/` (procedures) + `examples/` (demonstrations) + `patterns/` (reusable solutions) + `templates/` (output formats) + `guidelines/` (quality)

2. **Complexity Progression**: basic/ → intermediate/ → advanced/ examples, allowing users to start simple and graduate to complex scenarios

3. **Learning Approach**: Reference-based - Claude reads comprehensive examples and applies patterns to user requests in real-time

4. **Validation Strategy**: Pre-delivery checklist enforcing constitution compliance (constraint satisfaction, referential integrity, edge cases, validation reports)

5. **Format Support**: SQL DDL (primary), JSON Schema (secondary), ORM models (documented patterns)

### Constitution Compliance

All 5 core principles enforced through skill documentation:
- ✅ I. Database Constraint Compliance - Mandatory validation gates
- ✅ II. Production-Like Patterns - Realistic data examples and distribution strategies
- ✅ III. Referential Integrity - Topological generation workflows
- ✅ IV. Edge Case Coverage - Edge case catalog and integration patterns
- ✅ V. Validation Before Delivery - Validation workflow mandatory before any output

### File Organization Rationale

**Why separated workflows/examples/patterns**:
- **Discoverability**: Users find relevant content faster
- **Maintainability**: Update one pattern without touching unrelated content
- **Scalability**: Add new examples/patterns without restructuring
- **Context efficiency**: Claude loads only needed sections

**Why examples organized by complexity**:
- **Progressive learning**: Users start basic, graduate naturally
- **Independent value**: Each level usable on its own
- **Clear expectations**: Complexity level sets user mental model

**Why templates separate**:
- **Reusability**: Same templates across all examples
- **Consistency**: Single source of truth for output formats
- **Validation**: Easy to verify outputs match templates

This plan provides complete blueprint for creating the test data generation skill through systematic documentation creation.
