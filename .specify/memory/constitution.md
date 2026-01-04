<!--
SYNC IMPACT REPORT
==================
Version Change: [NEW] → 1.0.0
Rationale: Initial constitution creation for test data generation skill

Modified Principles: N/A (new constitution)
Added Sections:
  - Core Principles (5 principles)
  - Data Quality Standards
  - Development Workflow
  - Governance

Removed Sections: N/A

Templates Status:
  ✅ .specify/templates/plan-template.md - Reviewed, no changes required (constitution gates will be auto-applied)
  ✅ .specify/templates/spec-template.md - Reviewed, compatible with data-focused requirements
  ✅ .specify/templates/tasks-template.md - Reviewed, supports validation and constraint-checking tasks
  ⚠ Command files (.claude/commands/*.md) - Reviewed, no agent-specific references found

Follow-up TODOs: None
-->

# Test Data Generation Skill Constitution

## Core Principles

### I. Database Constraint Compliance (NON-NEGOTIABLE)

Generated data MUST respect ALL database constraints without exception:
- Primary keys: Unique, non-null, correctly typed
- Foreign keys: Valid references to existing parent records
- Unique constraints: No duplicate values in constrained columns
- Check constraints: All conditions satisfied
- NOT NULL constraints: No missing required values
- Data type constraints: Correct types, lengths, and formats

**Rationale**: Constraint violations render test data unusable and can mask real application bugs. Test data that violates constraints creates false positives during testing and undermines confidence in the test suite.

### II. Production-Like Data Patterns

Data MUST mirror real-world characteristics and distributions:
- Realistic names, addresses, emails (locale-appropriate)
- Plausible date ranges and temporal patterns
- Representative data distributions (Zipf, normal, etc. as appropriate)
- Authentic formatting (phone numbers, postal codes, etc.)
- Domain-specific vocabulary and patterns
- Realistic cardinalities in relationships

**Rationale**: Synthetic data that doesn't reflect production patterns produces misleading test results. Tests against unrealistic data can miss edge cases, performance issues, and user experience problems that only surface with production-like datasets.

### III. Referential Integrity Maintenance

All relationships between entities MUST be internally consistent:
- Foreign key relationships properly maintained
- Cascade delete/update semantics respected
- Many-to-many junction tables correctly populated
- Orphaned records prohibited unless explicitly specified
- Hierarchical relationships (parent-child, tree structures) valid
- Cross-entity business rules enforced (e.g., order items → valid products)

**Rationale**: Broken relationships corrupt the dataset and lead to misleading test outcomes. Referential integrity ensures the generated data reflects real application state that would exist in production.

### IV. Edge Case Coverage

Generated datasets MUST include boundary conditions and edge cases:
- Minimum and maximum valid values
- Empty collections and null optionals
- Boundary dates (start/end of ranges, epoch, future dates)
- String edge cases (empty, single-char, max-length, special characters, Unicode)
- Numeric boundaries (zero, negative, overflow boundaries)
- State transitions (new, pending, completed, failed, etc.)

**Rationale**: Most bugs occur at boundaries. Test data without edge cases produces a false sense of quality and allows boundary bugs to reach production.

### V. Validation Before Delivery (NON-NEGOTIABLE)

All generated data MUST be validated prior to use:
- Schema compliance verification (structure matches expected schema)
- Constraint satisfaction check (all DB constraints pass)
- Relationship integrity validation (all foreign keys resolve)
- Statistical sanity checks (distributions within expected ranges)
- Required field completeness (no unexpected nulls)
- Custom business rule validation (domain-specific rules enforced)

**Rationale**: Delivering invalid test data wastes downstream testing time and erodes trust in the data generation system. Pre-delivery validation catches generation errors early and ensures high-quality test data every time.

## Data Quality Standards

### Reproducibility

- Generated data MUST be reproducible given the same seed/configuration
- Random number generators MUST support seeding for deterministic output
- Generation parameters (schema version, seed, cardinality) MUST be recorded
- Versioning of data generation logic required for auditability

### Performance Targets

- Small datasets (<1000 records): Generate in <5 seconds
- Medium datasets (<100k records): Generate in <60 seconds
- Large datasets (>100k records): Stream/batch generation with progress reporting
- Memory usage MUST scale sub-linearly with dataset size (avoid loading entire dataset in memory)

### Documentation Requirements

- Schema inputs MUST be documented (source, version, format)
- Generation strategies MUST be explained (algorithms, distributions used)
- Edge case coverage MUST be enumerated (which cases are included)
- Validation rules MUST be listed (what checks are performed)

## Development Workflow

### Input Processing

1. Schema extraction from database, ORM models, or schema files
2. Constraint analysis and dependency graphing
3. Relationship mapping and topological ordering
4. Edge case identification and enumeration

### Generation Process

1. Seed initialization for reproducibility
2. Topological sort of entities (parents before children)
3. Record generation respecting constraints and distributions
4. Relationship population maintaining integrity
5. Edge case injection at configurable rate

### Validation Gate

Before delivery, ALL generated data passes through validation:
1. Schema conformance check
2. Constraint satisfaction verification
3. Referential integrity audit
4. Statistical distribution analysis
5. Business rule compliance check

Only data passing ALL validation steps proceeds to output.

### Output Delivery

- SQL insert statements (for direct DB loading)
- JSON/CSV exports (for application ingestion)
- ORM-compatible fixtures (language-specific)
- Validation report alongside data (proof of quality)

## Governance

### Amendment Process

This constitution governs all test data generation work. Amendments require:
1. Written proposal documenting the change and rationale
2. Impact analysis on existing templates and workflows
3. Version increment per semantic versioning rules
4. Update of all dependent templates and documentation

### Compliance Requirements

- All generated datasets MUST be validated against principles I, III, and V (NON-NEGOTIABLE)
- Production-like patterns (Principle II) and edge cases (Principle IV) MUST be included unless explicitly waived with documented justification
- Code reviews MUST verify constraint handling and validation logic
- Delivered data MUST include validation report proving compliance

### Complexity Justification

Any deviation from simplicity requires documentation:
- Why the complexity is necessary
- What simpler alternatives were considered
- Why simpler alternatives were rejected

### Versioning Policy

Constitution version follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward-incompatible principle changes or removals
- **MINOR**: New principles added or material expansions to existing principles
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

**Version**: 1.0.0 | **Ratified**: 2026-01-04 | **Last Amended**: 2026-01-04
