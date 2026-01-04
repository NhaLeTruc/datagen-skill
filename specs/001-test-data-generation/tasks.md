---

description: "Task list for test data generation skill implementation"
---

# Tasks: Test Data Generation Skill

**Input**: Design documents from `/home/bob/WORK/datagen-skill/specs/001-test-data-generation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: No automated tests for this documentation skill. Validation is example-based (demonstrate with real schemas).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Skill files**: `.claude/skills/test-data-generation/`
- **Documentation**: All files are markdown in skill directory structure
- This is a documentation skill - no traditional src/ or tests/ directories

---

## Phase 1: Setup (Skill Infrastructure)

**Purpose**: Create skill directory structure and foundational documentation files

- [x] T001 Create skill directory structure at .claude/skills/test-data-generation/
- [x] T002 [P] Create workflows/ subdirectory in .claude/skills/test-data-generation/workflows/
- [x] T003 [P] Create examples/ subdirectory structure in .claude/skills/test-data-generation/examples/ (basic/, intermediate/, advanced/)
- [x] T004 [P] Create patterns/ subdirectory in .claude/skills/test-data-generation/patterns/
- [x] T005 [P] Create templates/ subdirectory in .claude/skills/test-data-generation/templates/
- [x] T006 [P] Create guidelines/ subdirectory in .claude/skills/test-data-generation/guidelines/

---

## Phase 2: Foundational (Core Documentation)

**Purpose**: Core skill documentation that ALL user stories reference

**⚠️ CRITICAL**: No user story-specific work can begin until SKILL.md and core workflows are complete

- [x] T007 Write SKILL.md main entry point in .claude/skills/test-data-generation/SKILL.md with overview, activation patterns, quick start, workflow index, pattern catalog index, examples index
- [x] T008 Create constitution-alignment.md in .claude/skills/test-data-generation/guidelines/constitution-alignment.md documenting how skill enforces 5 core principles
- [x] T009 Create troubleshooting.md in .claude/skills/test-data-generation/guidelines/troubleshooting.md with common issues and solutions including: schema parsing errors (invalid DDL syntax, unsupported database features), constraint conflicts (impossible check constraints, circular FK without NULL path), generation failures (unable to satisfy unique constraint after N attempts, FK references non-existent parent), validation failures (post-generation constraint violations, referential integrity breaks)
- [x] T010 Create common-pitfalls.md in .claude/skills/test-data-generation/guidelines/common-pitfalls.md documenting anti-patterns to avoid

**Checkpoint**: Foundation ready - user story workflows and examples can now be created in parallel

---

## Phase 3: User Story 1 - Generate Constraint-Valid Test Data (Priority: P1) 🎯 MVP

**Goal**: Enable Claude to generate test data that respects ALL database constraints (primary keys, foreign keys, unique, NOT NULL, check constraints, data types)

**Independent Test**: Provide a schema with foreign key relationships, request generation, insert output into real database - zero constraint violation errors

### Workflows for User Story 1

- [x] T011 [P] [US1] Create 01-schema-analysis.md workflow in .claude/skills/test-data-generation/workflows/01-schema-analysis.md documenting how to parse SQL DDL, extract constraints (PK, FK, unique, NOT NULL, check, types), identify data types
- [x] T012 [P] [US1] Create 02-dependency-graphing.md workflow in .claude/skills/test-data-generation/workflows/02-dependency-graphing.md documenting how to build entity dependency graph from foreign keys, perform topological sort for generation order
- [x] T013 [P] [US1] Create 03-data-generation.md workflow in .claude/skills/test-data-generation/workflows/03-data-generation.md documenting parent-before-children generation, constraint satisfaction during value generation, self-referencing FK handling (tiered generation)
- [x] T014 [P] [US1] Create 04-validation.md workflow in .claude/skills/test-data-generation/workflows/04-validation.md documenting pre-delivery validation checklist (schema conformance, constraint satisfaction, referential integrity, validation report structure)

### Patterns for User Story 1

- [ ] T015 [US1] Create constraint-handling.md pattern in .claude/skills/test-data-generation/patterns/constraint-handling.md documenting how to handle each constraint type (PK: unique generation using UUID or sequential IDs, FK: reference pool of existing parent IDs, unique: track used values in set to prevent duplicates, NOT NULL: no skip logic - always generate value, check: parse condition and satisfy constraint, types: match precision/scale/length exactly)
- [ ] T015b [US1] Document cascade semantics in constraint-handling.md in .claude/skills/test-data-generation/patterns/constraint-handling.md: ON DELETE CASCADE (generate child records that would survive parent deletion), ON DELETE SET NULL (allow nullable FKs to be set NULL), ON UPDATE CASCADE (maintain FK references when parent PK changes), ON DELETE RESTRICT (ensure all generated data respects restriction)
- [ ] T015c [P] [US1] Create reproducibility.md pattern in .claude/skills/test-data-generation/patterns/reproducibility.md documenting seed initialization for deterministic generation, seed recording in validation reports, deterministic RNG usage for all random values (names, dates, distributions), same seed + same schema = identical output guarantee

### Examples for User Story 1

- [ ] T016 [P] [US1] Create users-table.md basic example in .claude/skills/test-data-generation/examples/basic/users-table.md with simple single-table schema (PK, unique email, NOT NULL name, check age >= 18), generated data (10 records), validation report
- [ ] T017 [P] [US1] Create products-table.md basic example in .claude/skills/test-data-generation/examples/basic/products-table.md with single-table schema (PK, unique SKU, check price >= 0, NOT NULL fields), generated data, validation report
- [ ] T018 [US1] Create ecommerce-schema.md intermediate example in .claude/skills/test-data-generation/examples/intermediate/ecommerce-schema.md with multi-table FK relationships (users, products, orders, order_items), topological generation order, constraint-valid data, validation report proving 100% constraint satisfaction

### Templates for User Story 1

- [ ] T019 [P] [US1] Create validation-report.md template in .claude/skills/test-data-generation/templates/validation-report.md with required sections (generation metadata, constraint satisfaction checks, referential integrity audit, edge case coverage, distribution analysis, warnings)
- [ ] T020 [P] [US1] Create sql-insert-format.md template in .claude/skills/test-data-generation/templates/sql-insert-format.md with SQL INSERT syntax, escaping rules, one statement per record format, comment annotations

**Checkpoint**: User Story 1 complete - Claude can generate constraint-valid test data for any schema, validate before delivery

---

## Phase 4: User Story 2 - Generate Production-Like Data Patterns (Priority: P2)

**Goal**: Enable Claude to generate realistic data patterns with locale-appropriate formatting and statistical distributions

**Independent Test**: Analyze generated dataset's statistical properties - verify distribution shapes, check address/phone format correctness, confirm temporal patterns

### Workflows for User Story 2

- [x] T021 [US2] Update 03-data-generation.md workflow in .claude/skills/test-data-generation/workflows/03-data-generation.md to add realistic pattern generation (names from name distributions, addresses with locale formatting, emails with realistic domains, temporal patterns for timestamps)

### Patterns for User Story 2

- [x] T022 [P] [US2] Create distribution-strategies.md pattern in .claude/skills/test-data-generation/patterns/distribution-strategies.md documenting Zipf distribution (product popularity, user activity), normal distribution (measurements, quantities), uniform distribution (default), when to use each
- [x] T023 [P] [US2] Create locale-patterns.md pattern in .claude/skills/test-data-generation/patterns/locale-patterns.md documenting US English patterns (US addresses with state codes and ZIP codes, phone numbers (XXX) XXX-XXXX format, names from US distributions), locale fallback strategy (unsupported locales → US English with warning)

### Examples for User Story 2

- [x] T024 [US2] Update ecommerce-schema.md intermediate example in .claude/skills/test-data-generation/examples/intermediate/ecommerce-schema.md to add realistic patterns (names from distributions not random strings, addresses with valid US state codes and ZIP patterns, temporal ordering: more orders on weekdays, Zipf distribution for product popularity in orders), validation report showing distribution analysis

### Advanced Examples for User Story 2

- [x] T025 [P] [US2] Create blog-platform.md intermediate example in .claude/skills/test-data-generation/examples/intermediate/blog-platform.md with multi-table schema (users, posts, comments, tags), realistic patterns (author names, post titles, temporal patterns for publication dates), validation report
- [x] T026 [P] [US2] Create self-referencing-hierarchies.md advanced example in .claude/skills/test-data-generation/examples/advanced/self-referencing-hierarchies.md with Employee.managerId → Employee.id schema, tiered generation (first employees NULL managerId, subsequent reference earlier employees), realistic organizational hierarchy

**Checkpoint**: User Story 2 complete - Claude generates production-like data patterns with realistic distributions and locale-appropriate formatting

---

## Phase 5: User Story 3 - Include Edge Cases for Testing (Priority: P3)

**Goal**: Enable Claude to integrate edge cases at configurable percentage (default 5%) covering boundary conditions and special values

**Independent Test**: Inspect generated dataset - verify edge cases present at requested frequency with correct boundary values

### Patterns for User Story 3

- [x] T027 [US3] Create edge-case-catalog.md pattern in .claude/skills/test-data-generation/patterns/edge-case-catalog.md documenting edge cases per SQL data type (VARCHAR: min length 0, max length, special characters, unicode; INT: 0, negative, max value; DATE: epoch 1970-01-01, 2038 problem 2038-01-19, far future; DECIMAL: 0.00, max precision; BOOLEAN: both true and false; NULL for optional fields)

### Workflow Updates for User Story 3

- [x] T028 [US3] Update 03-data-generation.md workflow in .claude/skills/test-data-generation/workflows/03-data-generation.md to add edge case injection at configurable percentage, constraint-first principle (skip edge cases that violate constraints, document skipped cases in validation report)

### Examples for User Story 3

- [x] T029 [US3] Update users-table.md basic example in .claude/skills/test-data-generation/examples/basic/users-table.md to add edge cases (user with age=18 for min age check constraint, user with 255-char name for max length, user with special characters in email like test+tag@example.com, edge case coverage 5% documented in validation report)
- [x] T030 [P] [US3] Create circular-dependencies.md advanced example in .claude/skills/test-data-generation/examples/advanced/circular-dependencies.md with circular FK scenario (e.g., Department.managerId → Employee.id, Employee.departmentId → Department.id), resolution strategy (break cycle by generating one entity first with NULL, then other entity, then update), edge case: NULL foreign keys
- [x] T031 [P] [US3] Create multi-tenant-system.md advanced example in .claude/skills/test-data-generation/examples/advanced/multi-tenant-system.md with complex multi-table schema including tenant isolation, edge cases (tenant with 0 users, tenant with max users, cross-tenant FK handling), validation report

**Checkpoint**: User Story 3 complete - Claude integrates edge cases covering boundary conditions at configurable percentage

---

## Phase 6: User Story 4 - Export Data in Multiple Formats (Priority: P4)

**Goal**: Enable Claude to export same dataset in SQL, JSON, and CSV formats with identical data across all formats

**Independent Test**: Generate data in all three formats - verify record count, key values, and relationships identical across formats

### Workflows for User Story 4

- [ ] T032 [US4] Create 05-export-formats.md workflow in .claude/skills/test-data-generation/workflows/05-export-formats.md documenting SQL INSERT format (one statement per record, proper escaping), JSON array format (proper nesting for relationships), CSV format (headers, proper quoting/escaping for special characters), consistency validation (generate once in memory, serialize to each format, run consistency check comparing record counts and key field values across all formats before delivery)

### Templates for User Story 4

- [ ] T033 [P] [US4] Create json-export-format.md template in .claude/skills/test-data-generation/templates/json-export-format.md with JSON array structure, nesting for relationships, proper JSON escaping, example output
- [ ] T034 [P] [US4] Create csv-export-format.md template in .claude/skills/test-data-generation/templates/csv-export-format.md with header row format, quoting rules for special characters (commas, quotes, newlines), escaping rules, example output

### Examples for User Story 4

- [ ] T035 [US4] Update ecommerce-schema.md intermediate example in .claude/skills/test-data-generation/examples/intermediate/ecommerce-schema.md to include SQL, JSON, and CSV outputs for same dataset, demonstrate consistency (record counts match, key values identical), validation note confirming format consistency

**Checkpoint**: User Story 4 complete - Claude exports data in multiple formats with guaranteed consistency

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation improvements that enhance all user stories

- [ ] T036 [P] Add comprehensive quick start example to SKILL.md in .claude/skills/test-data-generation/SKILL.md showing minimal 30-second workflow (provide simple schema, request generation, receive data + validation report)
- [ ] T037 [P] Add activation pattern examples to SKILL.md in .claude/skills/test-data-generation/SKILL.md documenting exact phrases Claude should recognize ("Generate test data for [schema]", "I need sample data with [X] records", "Create realistic test data", "Generate SQL/JSON/CSV fixtures")
- [ ] T038 [P] Add cross-references between workflows in all workflow files (.claude/skills/test-data-generation/workflows/*.md) linking to relevant patterns and examples
- [ ] T039 [P] Add pattern usage examples in all pattern files (.claude/skills/test-data-generation/patterns/*.md) referencing specific examples that demonstrate each pattern
- [ ] T040 [P] Review all examples for constitution alignment in .claude/skills/test-data-generation/examples/*/*.md ensuring each demonstrates constraint compliance, referential integrity, edge cases, validation
- [ ] T041 Add skill metadata/frontmatter to SKILL.md in .claude/skills/test-data-generation/SKILL.md with skill name, version, author, description, tags for discoverability
- [ ] T042 Create README.md for skill directory in .claude/skills/test-data-generation/README.md with skill overview, file structure explanation, how to extend with custom examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (Phase 3): Can start after Foundational - NO dependencies on other stories
  - User Story 2 (Phase 4): Can start after Foundational - Updates examples from US1 but independently testable
  - User Story 3 (Phase 5): Can start after Foundational - Updates examples from US1 but independently testable
  - User Story 4 (Phase 6): Can start after Foundational - Updates examples from US1 but independently testable
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Constraint-Valid Data**: Foundational - No dependencies on other stories
- **User Story 2 (P2) - Production-Like Patterns**: Can start after Foundational - Updates US1 examples but independently testable
- **User Story 3 (P3) - Edge Cases**: Can start after Foundational - Updates US1 examples but independently testable
- **User Story 4 (P4) - Multi-Format Export**: Can start after Foundational - Updates US1 examples but independently testable

### Within Each User Story

- Workflows can be created in parallel with patterns and templates
- Examples should reference completed workflows and patterns
- Advanced examples may reference intermediate examples
- All story tasks complete before moving to next priority

### Parallel Opportunities

- **Setup (Phase 1)**: All T002-T006 can run in parallel (creating subdirectories)
- **Foundational (Phase 2)**: T008, T009, T010 can run in parallel after T007 (guidelines files are independent)
- **User Story 1**:
  - T011, T012, T013, T014 can run in parallel (workflows are independent)
  - T016, T017 can run in parallel (basic examples are independent)
  - T019, T020 can run in parallel (templates are independent)
- **User Story 2**:
  - T022, T023 can run in parallel (pattern files are independent)
  - T025, T026 can run in parallel (advanced examples are independent)
- **User Story 3**:
  - T030, T031 can run in parallel (advanced examples are independent)
- **User Story 4**:
  - T033, T034 can run in parallel (template files are independent)
- **Polish (Phase 7)**: T036, T037, T038, T039, T040 can run in parallel (independent documentation updates)

---

## Parallel Example: User Story 1

```bash
# Launch all workflows for User Story 1 together:
Task: "Create 01-schema-analysis.md in .claude/skills/test-data-generation/workflows/"
Task: "Create 02-dependency-graphing.md in .claude/skills/test-data-generation/workflows/"
Task: "Create 03-data-generation.md in .claude/skills/test-data-generation/workflows/"
Task: "Create 04-validation.md in .claude/skills/test-data-generation/workflows/"

# Launch all basic examples together:
Task: "Create users-table.md in .claude/skills/test-data-generation/examples/basic/"
Task: "Create products-table.md in .claude/skills/test-data-generation/examples/basic/"

# Launch all templates together:
Task: "Create validation-report.md in .claude/skills/test-data-generation/templates/"
Task: "Create sql-insert-format.md in .claude/skills/test-data-generation/templates/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (skill directory structure)
2. Complete Phase 2: Foundational (SKILL.md + core guidelines)
3. Complete Phase 3: User Story 1 (constraint-valid data generation)
4. **STOP and VALIDATE**: Test with real schema - verify zero constraint violations
5. Skill is usable for basic constraint-valid data generation

### Incremental Delivery

1. Setup + Foundational → Skill structure ready
2. Add User Story 1 → Test with real schemas → **MVP: Constraint-valid data**
3. Add User Story 2 → Test realistic patterns → **v1.1: Production-like data**
4. Add User Story 3 → Test edge case coverage → **v1.2: Edge case coverage**
5. Add User Story 4 → Test multi-format export → **v1.3: Multi-format support**
6. Polish → **v1.4: Complete skill with comprehensive documentation**

### Parallel Team Strategy

With multiple writers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Writer A: User Story 1 (workflows + basic examples)
   - Writer B: User Story 2 (patterns + advanced examples)
   - Writer C: User Story 3 (edge case patterns + examples)
   - Writer D: User Story 4 (export templates + format examples)
3. Stories complete and integrate independently

---

## Validation Strategy (Example-Based Testing)

Since this is a documentation skill, validation is example-based rather than automated tests:

### User Story 1 Validation
- Provide ecommerce schema with FK relationships to Claude
- Request 1000 records generation
- Attempt to INSERT into real PostgreSQL database
- **Success criteria**: Zero constraint violation errors

### User Story 2 Validation
- Request e-commerce data with Zipf distribution for products
- Request user data with US locale
- Analyze generated dataset
- **Success criteria**:
  - 20% of products account for ~80% of orders (Zipf validation)
  - All addresses use valid US state codes
  - All phone numbers follow (XXX) XXX-XXXX format

### User Story 3 Validation
- Request data with 10% edge case coverage
- Inspect generated dataset
- **Success criteria**:
  - ~10% of records contain edge case values
  - Edge cases include min/max lengths, boundary dates, special characters
  - Validation report documents edge case coverage

### User Story 4 Validation
- Request same dataset in SQL, JSON, CSV formats
- Compare outputs
- **Success criteria**:
  - Record counts identical across all formats
  - Key values match across all formats
  - Relationships preserved in all formats

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story delivers independently usable increment
- All examples must include validation reports proving constraint compliance
- No automated tests - validation is example-based with real schemas
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently with real schemas
- Avoid: vague documentation, missing file paths, examples without validation reports
