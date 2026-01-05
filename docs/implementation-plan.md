# Implementation Plan: Test Data Generation Tool (v2.0)

**Date**: 2026-01-05
**Status**: Ready for Approval
**Approach**: Tool-first with maximum token efficiency
**Target**: Address all SWOT threats, weaknesses, and opportunities

---

## Executive Summary

Transform the 13,433-line documentation-only Test Data Generation Skill into a production-ready **TypeScript CLI tool** (`@claude-code/testdatagen`) with token-efficient skill integration. This plan addresses all identified threats, weaknesses, and opportunities while achieving:

- ✅ **Maximum reliability** through deterministic tool execution
- ✅ **Minimal token usage** through condensed documentation (85% reduction: 13k → <2k lines)
- ✅ **Full database integration** with schema introspection
- ✅ **Production-grade features** (multi-locale, distributions, validation)

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 High-Level Design

```
User Request → Claude Skill (condensed docs) → CLI Tool → Validated Output
                  ↓
         Tool Invocation Decision
                  ↓
    testdatagen generate <schema> [options]
                  ↓
    ┌─────────────────────────────────────┐
    │   @claude-code/testdatagen (npm)    │
    ├─────────────────────────────────────┤
    │ 1. Parse Schema (SQL/Prisma/JSON)   │
    │ 2. Extract Constraints               │
    │ 3. Build Dependency Graph            │
    │ 4. Generate (topological order)      │
    │    - Faker.js (realistic data)       │
    │    - SciPy (distributions)           │
    │    - Custom constraint satisfaction  │
    │ 5. Validate (100% satisfaction)      │
    │ 6. Export (SQL/JSON/CSV)             │
    └─────────────────────────────────────┘
                  ↓
    Validated Data + Report
```

### 1.2 Technology Stack

**Primary Language**: TypeScript/Node.js
- **CLI Framework**: Commander.js
- **Realistic Data**: Faker.js (70+ locales)
- **Schema Parsing**: node-sql-parser + Prisma introspection
- **Database Drivers**: pg (PostgreSQL), mysql2 (MySQL), better-sqlite3 (SQLite)
- **Statistical Distributions**: Python subprocess with SciPy
- **Testing**: Jest (unit + integration)

**Python Integration** (subprocess for distributions):
- **SciPy**: Zipf and Normal distributions
- **NumPy**: Statistical operations
- **sqlparse**: Fallback SQL parsing

### 1.3 CLI Tool Interface

```bash
# Basic generation
testdatagen generate schema.sql --count 1000 --format sql

# Database introspection
testdatagen introspect postgres://localhost/mydb --count 10000

# Interactive mode
testdatagen generate schema.sql --interactive

# Custom distributions
testdatagen generate schema.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf" \
  --distribution "users.age:normal:mean=35,std=12" \
  --locale uk \
  --edge-cases 10 \
  --seed 42

# Validation only
testdatagen validate data.sql schema.sql

# Config file
testdatagen generate --config testdatagen.config.json
```

---

## 2. SKILL TRANSFORMATION (Token Efficiency)

### 2.1 Documentation Condensation

**Target**: Reduce from 13,433 lines → <2,000 lines (85% reduction)

**Strategy**:

| Content Type | Current Lines | After | Location |
|--------------|---------------|-------|----------|
| Workflows (5 files) | 3,000+ | 200 | Move to tool README |
| Patterns (5 files) | 3,500+ | 300 | Move to tool source code |
| Examples (8 files) | 2,600+ | 500 | Condense, link to tool repo |
| Templates (4 files) | 2,400+ | 100 | Tool generates these |
| Guidelines (3 files) | 1,500+ | 300 | Consolidate troubleshooting |
| SKILL.md | 200 | 400 | Expand with tool usage |
| README.md | 450 | 200 | Simplify, link to tool |
| **Total** | **13,433** | **<2,000** | **85% reduction** |

### 2.2 New SKILL.md Structure

```markdown
# Test Data Generation Skill v2.0 (Tool-Powered)

## Overview
Generate constraint-valid test data using production CLI tool.

## Installation
npm install -g @claude-code/testdatagen

## Quick Start
testdatagen generate schema.sql --count 1000 --format sql

## Activation Patterns
- "Generate test data for [schema]"
- "I need [X] records with realistic data"
- "Create fixtures for testing"

## Examples
### Single Table
testdatagen generate users.sql --count 100

### Multi-Table with FK
testdatagen generate ecommerce.sql --count 10000 --distribution "product_id:zipf"

### Database Introspection
testdatagen introspect postgres://localhost/mydb --count 5000

## Constitutional Principles (Enforced by Tool)
1. Constraint Compliance (100% satisfaction)
2. Production-Like Patterns (Faker.js, 6 locales)
3. Referential Integrity (topological generation)
4. Edge Case Coverage (5% default, configurable)
5. Validation Before Delivery (mandatory)

## Troubleshooting
### Schema Parse Error
Use --introspect with live database

### Constraint Conflict
Check for contradictory CHECK constraints

### Performance Issues
Use --streaming for >100k records

## Advanced Features
- Multi-locale: --locale us|uk|de|fr|ca|au
- Distributions: --distribution "field:zipf|normal"
- ORM Export: --format django|rails|prisma
- Statistical Validation: Chi-squared, K-S tests

## See Also
- Tool Repository: github.com/claude-code/testdatagen
- Full Documentation: testdatagen.docs.claude.ai
```

**Result**: SKILL.md becomes a concise tool invocation guide (~500 lines)

---

## 3. IMPLEMENTATION PHASES

### Phase 1: MVP (Weeks 1-3)

**Goal**: Basic constraint-valid generation for single-table schemas

**Deliverables**:
1. CLI scaffolding with Commander.js
2. SQL DDL parser (node-sql-parser)
3. Constraint extractors (PK, FK, UNIQUE, NOT NULL, CHECK)
4. Basic value generators:
   - Sequential PK generator
   - FK pool-based generator
   - Uniqueness tracker
   - Faker.js integration (names, emails)
5. Simple constraint validator
6. SQL INSERT exporter
7. Unit test suite (20+ tests)

**Success Criteria**:
- ✅ Parse CREATE TABLE statements
- ✅ Generate 100% constraint-valid data
- ✅ Export valid SQL INSERT statements
- ✅ Pass 20+ unit tests

**Key Files Created**:
- `testdatagen/package.json`
- `testdatagen/src/cli/index.ts`
- `testdatagen/src/core/parser/sql-parser.ts`
- `testdatagen/src/core/generator/engine.ts`
- `testdatagen/src/core/validator/constraint-validator.ts`
- `testdatagen/tests/unit/*.test.ts`

**Example Usage**:
```bash
testdatagen generate examples/basic-users.sql --count 100 --format sql
# Output: users.sql (100 records, all constraints satisfied)
```

---

### Phase 2: Production Features (Weeks 4-6)

**Goal**: Multi-table relationships, distributions, locales, full validation

**Deliverables**:
1. Dependency graph builder + topological sort
2. Multi-table generation engine
3. Python subprocess bridge for distributions
4. SciPy integration (Zipf, Normal)
5. Multi-locale support via Faker.js (US, UK, DE, FR, CA, AU)
6. Edge case injection (configurable percentage)
7. JSON and CSV exporters
8. Validation report generator
9. Config file support (JSON/YAML)
10. Integration tests with real databases

**Success Criteria**:
- ✅ Generate valid data for 3-table e-commerce schema
- ✅ Zipf distribution verified statistically (Chi-squared test)
- ✅ 6 locales produce locale-appropriate data
- ✅ Edge cases at specified percentage (±2%)
- ✅ JSON/CSV match SQL data (consistency validation)

**Key Files Created**:
- `testdatagen/src/core/analyzer/dependency-graph.ts`
- `testdatagen/src/core/generator/distributions/zipf.ts`
- `testdatagen/src/core/exporter/json-exporter.ts`
- `testdatagen/src/utils/python-bridge.ts`
- `testdatagen/python/distributions.py`
- `testdatagen/tests/integration/*.test.ts`

**Example Usage**:
```bash
testdatagen generate examples/ecommerce.sql \
  --count 10000 \
  --distribution "orders.product_id:zipf" \
  --locale uk \
  --format all \
  --seed 42
# Output: users.sql, products.sql, orders.sql + validation-report.json
```

---

### Phase 3: Advanced Features (Weeks 7-9)

**Goal**: Database integration, ORM export, advanced scenarios

**Deliverables**:
1. Prisma schema introspection
2. Database connectors (PostgreSQL, MySQL, SQLite)
3. Self-referencing FK handler (tiered generation)
4. Circular dependency resolver
5. ORM exporters (Django, Rails, Prisma fixtures)
6. Statistical validation (Chi-squared, K-S tests)
7. Custom value generator (pattern DSL: ABC-####-XX)
8. Streaming for large datasets (>100k records)
9. Interactive mode (progressive parameter confirmation)
10. Advanced examples (multi-tenant, time-series, geospatial)

**Success Criteria**:
- ✅ Introspect live PostgreSQL database
- ✅ Generate valid data for self-referencing Employee table
- ✅ Export Django fixtures (valid format)
- ✅ Statistical tests validate distributions (p-value > 0.05)
- ✅ Generate 1M records without OOM
- ✅ Interactive mode guides user through configuration

**Key Files Created**:
- `testdatagen/src/core/database/introspection.ts`
- `testdatagen/src/core/database/connectors/postgresql.ts`
- `testdatagen/src/core/exporter/orm-exporters/django.ts`
- `testdatagen/src/core/validator/statistical-validator.ts`
- `testdatagen/src/utils/streaming.ts`
- `testdatagen/examples/advanced/*.sql`

**Example Usage**:
```bash
# Database introspection
testdatagen introspect postgres://localhost/proddb --count 50000

# Self-referencing hierarchy
testdatagen generate employees.sql \
  --count 1000 \
  --custom-generator "employee_code:EMP-#####"

# Django fixtures
testdatagen generate schema.sql --count 5000 --format django --output fixtures/
```

---

### Phase 4: Polish & CI (Weeks 10-12)

**Goal**: Testing, performance optimization, documentation, CI pipeline

**Deliverables**:
1. Comprehensive test suite (80%+ coverage)
2. Performance benchmarks (10k, 100k, 1M records)
3. CI pipeline (GitHub Actions):
   - Unit tests
   - Integration tests (Docker databases)
   - Example validation (smoke tests)
   - Performance regression tests
4. Full tool documentation (README, API docs, examples)
5. Migration guide (v1.0 docs → v2.0 tool)
6. npm package publish
7. Skill documentation update (condensed)
8. Example validation in CI

**Success Criteria**:
- ✅ 80%+ test coverage
- ✅ All CI checks pass
- ✅ 1M records generated in <60s
- ✅ Documentation complete
- ✅ npm package published
- ✅ Skill token count <2k lines

**Key Files Created**:
- `.github/workflows/test.yml`
- `.github/workflows/publish.yml`
- `testdatagen/benchmarks/performance.ts`
- `testdatagen/docs/api.md`
- `.claude/skills/test-data-generation/MIGRATION.md`

**CI Pipeline**:
```yaml
jobs:
  - unit-tests (Jest)
  - integration-tests (PostgreSQL, MySQL via Docker)
  - example-validation (smoke tests for all examples)
  - performance-tests (benchmark 1M records <60s)
  - publish (npm publish on tag)
```

---

## 4. THREAT MITIGATION

| Threat | Mitigation | Phase |
|--------|------------|-------|
| **Skill complexity overwhelming Claude** | Condense 13k → <2k lines (85% reduction) | Phase 4 |
| **Inconsistent interpretation** | Replace with deterministic CLI tool | Phase 1-3 |
| **Schema parsing errors** | node-sql-parser + Prisma introspection | Phase 1, 3 |
| **Constraint conflict resolution** | Early validation, fail-fast with clear errors | Phase 1 |
| **Performance at scale** | Streaming for 100k+ records, benchmarks | Phase 3, 4 |
| **Example drift** | CI validates all examples on every commit | Phase 4 |
| **No schema evolution handling** | Config file support for incremental generation | Phase 2 |

---

## 5. WEAKNESS ELIMINATION

| Weakness | Solution | Phase |
|----------|---------|-------|
| **No implementation** | Full TypeScript CLI tool + npm package | Phase 1-4 |
| **US locale only** | Faker.js 6 locales (US, UK, DE, FR, CA, AU) | Phase 2 |
| **No statistical distributions** | SciPy integration (Zipf, Normal) | Phase 2 |
| **Static edge cases** | Custom edge case definitions via config | Phase 3 |
| **Limited custom value generators** | Pattern DSL parser (ABC-####-XX) | Phase 3 |
| **No performance benchmarks** | Benchmark suite + CI regression tests | Phase 4 |
| **Incomplete advanced scenarios** | Geospatial, JSON columns, time-series examples | Phase 3 |
| **No testing** | 80%+ coverage, unit + integration + CI | Phase 1-4 |
| **Ambiguous multi-tenant** | Expanded multi-tenant example with isolation | Phase 3 |
| **No DB-specific dialects** | PostgreSQL, MySQL, SQLite native drivers | Phase 3 |

---

## 6. OPPORTUNITY REALIZATION

| Opportunity | Implementation | Phase |
|-------------|----------------|-------|
| **Interactive mode** | Progressive parameter confirmation CLI | Phase 3 |
| **Multi-locale support** | 6 locales via Faker.js | Phase 2 |
| **Statistical validation** | Chi-squared, K-S tests via SciPy | Phase 3 |
| **Real implementation** | Full TypeScript library + CLI | Phase 1-3 |
| **Database integration** | Prisma + native drivers | Phase 3 |
| **Advanced examples** | Geospatial, time-series, JSON columns | Phase 3 |
| **Business rule validation** | Custom validators in config | Phase 3 |
| **Data relationship patterns** | User personas, realistic cardinalities | Phase 2 |
| **ORM export** | Django, Rails, Prisma fixtures | Phase 3 |

---

## 7. PROJECT STRUCTURE

```
/home/bob/WORK/datagen-skill/
├── testdatagen/                           # NEW: CLI tool package
│   ├── src/
│   │   ├── cli/
│   │   │   ├── commands/
│   │   │   │   ├── generate.ts            # Main command
│   │   │   │   ├── introspect.ts          # DB introspection
│   │   │   │   └── validate.ts            # Validation command
│   │   │   └── index.ts                   # CLI entry
│   │   ├── core/
│   │   │   ├── parser/                    # SQL/Prisma/JSON schema parsing
│   │   │   ├── analyzer/                  # Constraint extraction, dependency graph
│   │   │   ├── generator/                 # Value generators, distributions
│   │   │   ├── validator/                 # Constraint + statistical validation
│   │   │   ├── exporter/                  # SQL/JSON/CSV/ORM exporters
│   │   │   └── database/                  # DB connectors, introspection
│   │   ├── types/                         # TypeScript type definitions
│   │   └── utils/                         # Python bridge, streaming, logging
│   ├── python/
│   │   ├── distributions.py               # SciPy Zipf/Normal
│   │   ├── statistical_tests.py           # Chi-squared, K-S tests
│   │   └── requirements.txt
│   ├── tests/
│   │   ├── unit/                          # Module-level tests
│   │   └── integration/                   # Multi-component tests
│   ├── examples/
│   │   ├── basic-users.sql
│   │   ├── ecommerce.sql
│   │   └── multi-tenant.sql
│   ├── benchmarks/                        # Performance tests
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── .claude/skills/test-data-generation/
│   ├── SKILL.md                           # MODIFY: Condense to ~500 lines
│   ├── examples/                          # MODIFY: 3 condensed examples
│   │   ├── basic-single-table.md
│   │   ├── multi-table-fk.md
│   │   └── self-referencing.md
│   ├── troubleshooting.md                 # NEW: Consolidated guide
│   └── MIGRATION.md                       # NEW: v1 → v2 migration
├── docs/
│   ├── SWOT.md                            # Already exists
│   ├── architecture.md                    # NEW: Design decisions
│   └── performance.md                     # NEW: Benchmark results
└── .github/workflows/
    ├── test.yml                           # NEW: CI pipeline
    └── publish.yml                        # NEW: npm publish
```

---

## 8. CRITICAL FILES TO MODIFY

### 8.1 SKILL.md (Primary Skill Interface)

**Current**: 202 lines (good, but needs tool integration)

**Changes**:
1. Add tool installation section
2. Replace workflow references with tool commands
3. Add tool invocation examples
4. Condense examples to show tool usage
5. Remove redundant pattern details (tool implements)
6. Add troubleshooting for tool errors

**Target**: ~500 lines (tool invocation guide)

---

### 8.2 README.md (Project Overview)

**Current**: 461 lines (comprehensive)

**Changes**:
1. Add "v2.0 Tool-Powered" banner
2. Update installation (npm install)
3. Link to tool repository
4. Show migration path from docs → tool
5. Simplify structure

**Target**: ~200 lines (high-level overview)

---

### 8.3 Workflow Files (Move to Tool Repo)

**Current**: 5 files, 3,000+ lines

**Changes**:
1. Replace detailed workflows with tool command references
2. Link to tool repository for implementation details
3. Keep high-level flow diagram

**Target**: 200 lines total (references only)

---

### 8.4 Pattern Files (Move to Tool Source)

**Current**: 5 files, 3,500+ lines

**Changes**:
1. Replace pseudocode with "See implementation: src/..."
2. Keep principle statements
3. Add quick reference tables

**Target**: 300 lines total (references + principles)

---

### 8.5 Examples (Condense to Tool Commands)

**Current**: 8 files, 2,600+ lines

**Changes**:
1. Keep 3 representative examples (basic, intermediate, advanced)
2. Show: Schema → Tool Command → Output
3. Link to tool repository for full details

**Target**: 500 lines total (3 condensed examples)

---

## 9. TESTING STRATEGY

### 9.1 Unit Tests (80%+ Coverage)

**Scope**: Individual modules in isolation

**Test Files**:
- `tests/unit/parser.test.ts`: SQL parsing correctness
- `tests/unit/constraint-extractor.test.ts`: Constraint extraction
- `tests/unit/dependency-graph.test.ts`: Topological sort
- `tests/unit/primary-key-generator.test.ts`: PK uniqueness
- `tests/unit/foreign-key-generator.test.ts`: FK pool selection
- `tests/unit/unique-generator.test.ts`: Uniqueness tracking
- `tests/unit/check-generator.test.ts`: Check constraint satisfaction

**Example**:
```typescript
describe('UniqueValueGenerator', () => {
  it('generates 1000 unique values', () => {
    const generator = new UniqueValueGenerator();
    const values = new Set<string>();

    for (let i = 0; i < 1000; i++) {
      const value = generator.generate(column, () => `user${i}@example.com`);
      expect(values.has(value)).toBe(false);
      values.add(value);
    }

    expect(values.size).toBe(1000);
  });
});
```

---

### 9.2 Integration Tests (Real Databases)

**Scope**: Multi-component workflows with PostgreSQL/MySQL

**Test Files**:
- `tests/integration/single-table.test.ts`: Basic generation + validation
- `tests/integration/multi-table.test.ts`: FK relationships
- `tests/integration/self-referencing.test.ts`: Employee.managerId
- `tests/integration/database-introspection.test.ts`: Live DB
- `tests/integration/large-dataset.test.ts`: 100k+ records

**Example**:
```typescript
describe('Multi-Table E-Commerce', () => {
  it('generates valid data for 3-table schema', async () => {
    // Generate data
    execSync('testdatagen generate examples/ecommerce.sql --count 100 --format sql --output /tmp/ecommerce.sql');

    // Load into PostgreSQL
    const data = readFileSync('/tmp/ecommerce.sql', 'utf-8');
    await pool.query(data);

    // Verify no orphans
    const orphanCheck = await pool.query(`
      SELECT COUNT(*) FROM orders o
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id)
    `);
    expect(orphanCheck.rows[0].count).toBe('0');
  });
});
```

---

### 9.3 CI Pipeline (GitHub Actions)

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      mysql:
        image: mysql:8
        env:
          MYSQL_ROOT_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      - run: pip install -r python/requirements.txt
      - run: npm ci
      - run: npm run test:integration

  example-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: |
          for example in examples/*.sql; do
            testdatagen generate "$example" --count 100 --validate
          done

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run benchmark
      - run: |
          # Fail if 1M records takes >60s
          npm run benchmark:1m | grep "Time:" | awk '{if ($2 > 60) exit 1}'
```

---

## 10. PERFORMANCE TARGETS

| Metric | Target | Measurement |
|--------|--------|-------------|
| **10k records** | <5s | Benchmark suite |
| **100k records** | <30s | Benchmark suite |
| **1M records** | <60s | Benchmark suite (CI gate) |
| **Memory (1M)** | <2GB | Process monitoring |
| **Token efficiency** | 85% reduction | Line count: 13k → <2k |
| **Test coverage** | 80%+ | Codecov |
| **CI pass rate** | 100% | GitHub Actions |

---

## 11. SUCCESS METRICS

### 11.1 Token Efficiency
- **Before**: 13,433 lines of skill documentation
- **After**: <2,000 lines of skill documentation
- **Reduction**: 85%+

### 11.2 Reliability
- **Target**: 100% constraint satisfaction
- **Measurement**: Integration tests, 0 constraint violations

### 11.3 Performance
- **1M records**: <60s (benchmark gate in CI)

### 11.4 Test Coverage
- **Unit + Integration**: 80%+
- **Example Validation**: 100% of examples pass

---

## 12. RISKS & MITIGATION

### Risk 1: Python Dependency
**Risk**: Users may not have Python/SciPy installed

**Mitigation**:
- Graceful fallback to JavaScript approximations
- Clear error message: "Install Python + SciPy for distributions"
- Optional dependency (documented)

### Risk 2: Database Driver Compatibility
**Risk**: DB-specific quirks in PostgreSQL vs MySQL vs SQLite

**Mitigation**:
- Comprehensive integration tests per database
- Document known limitations
- Prisma as primary introspection (handles quirks)

### Risk 3: Large Schema Parsing
**Risk**: node-sql-parser may fail on complex schemas

**Mitigation**:
- Fallback to Python sqlparse
- "Introspect mode" preferred for production databases
- Clear error messages with workarounds

---

## 13. MIGRATION STRATEGY

### 13.1 Rollout Plan

**Weeks 1-9**: Development (Phases 1-3)
- Build tool (no changes to v1.0 skill)

**Week 10**: Beta Testing
- Publish `@claude-code/testdatagen@beta`
- Update skill docs to reference beta
- Gather feedback

**Week 11**: Documentation Update
- Finalize skill condensation
- Publish MIGRATION.md
- Update README.md

**Week 12**: GA Release
- Publish `@claude-code/testdatagen@2.0.0`
- Deploy updated skill docs
- Archive v1.0 docs
- Announce in Claude Code release notes

### 13.2 Backward Compatibility

**Strategy**:
- Keep v1.0 docs in `archive/` directory
- Add MIGRATION.md guide
- Support both modes temporarily (tool preferred, docs fallback)

---

## 14. IMPLEMENTATION TIMELINE

```
Week 1-3   | Phase 1: MVP
           | - CLI scaffolding
           | - SQL parser
           | - Basic generators
           | - Simple validator
           | - Unit tests
           | ✓ Milestone: Generate single-table data

Week 4-6   | Phase 2: Production Features
           | - Dependency graph
           | - Multi-table generation
           | - Distributions (Zipf, Normal)
           | - Multi-locale (6 locales)
           | - Edge cases
           | - JSON/CSV exporters
           | - Config file support
           | ✓ Milestone: Generate multi-table data with distributions

Week 7-9   | Phase 3: Advanced Features
           | - Database introspection
           | - Self-referencing FKs
           | - ORM exporters
           | - Statistical validation
           | - Custom generators
           | - Streaming
           | - Interactive mode
           | ✓ Milestone: Full feature parity + advanced capabilities

Week 10-12 | Phase 4: Polish & CI
           | - Test suite completion (80%+ coverage)
           | - Performance benchmarks
           | - CI pipeline
           | - Documentation
           | - Migration guide
           | - npm publish
           | - Skill doc update
           | ✓ Milestone: Production-ready v2.0 release
```

---

## 15. DELIVERABLES CHECKLIST

### Phase 1 (MVP)
- [ ] CLI tool package structure
- [ ] SQL DDL parser
- [ ] Basic constraint extractors
- [ ] Value generators (PK, FK, unique, realistic)
- [ ] Constraint validator
- [ ] SQL INSERT exporter
- [ ] 20+ unit tests
- [ ] Example: basic-users.sql

### Phase 2 (Production)
- [ ] Dependency graph + topological sort
- [ ] Multi-table generation engine
- [ ] Python subprocess bridge
- [ ] SciPy distributions (Zipf, Normal)
- [ ] 6 locales via Faker.js
- [ ] Edge case injection
- [ ] JSON/CSV exporters
- [ ] Validation report generator
- [ ] Config file support
- [ ] Integration tests

### Phase 3 (Advanced)
- [ ] Prisma introspection
- [ ] PostgreSQL/MySQL/SQLite connectors
- [ ] Self-referencing FK handler
- [ ] ORM exporters (Django, Rails, Prisma)
- [ ] Statistical validation (Chi-squared, K-S)
- [ ] Custom pattern parser
- [ ] Streaming for large datasets
- [ ] Interactive mode
- [ ] Advanced examples

### Phase 4 (Polish)
- [ ] 80%+ test coverage
- [ ] Performance benchmarks (10k, 100k, 1M)
- [ ] CI pipeline (GitHub Actions)
- [ ] Full tool documentation
- [ ] Migration guide (MIGRATION.md)
- [ ] npm package published
- [ ] Skill docs condensed (<2k lines)
- [ ] Example validation in CI

---

## 16. CONCLUSION

This implementation plan transforms the Test Data Generation Skill from a 13,433-line documentation repository into a **production-ready TypeScript CLI tool** with **token-efficient skill integration**. The transformation:

✅ **Addresses all 7 threats** (complexity, inconsistency, parsing, conflicts, performance, drift, evolution)

✅ **Eliminates all 10 weaknesses** (implementation, locales, distributions, edge cases, generators, benchmarks, scenarios, testing, multi-tenant, dialects)

✅ **Realizes 10 opportunities** (interactive mode, multi-locale, statistical validation, database integration, ORM export, advanced examples, etc.)

✅ **Delivers in 4 phases over 12 weeks**:
- Phase 1 (MVP): Basic constraint-valid generation
- Phase 2 (Production): Multi-table, distributions, locales
- Phase 3 (Advanced): DB introspection, ORM export, streaming
- Phase 4 (Polish): Testing, CI, documentation, migration

**Result**: A **reliable, efficient, and capable** test data generation system that maximizes Claude's effectiveness through **tool-powered determinism** rather than **token-heavy interpretation**.

---

**Ready for Implementation**: ✅
**Approval Required**: Yes
**Next Step**: User approval → Begin Phase 1 development
