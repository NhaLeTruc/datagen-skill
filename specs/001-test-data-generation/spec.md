# Feature Specification: Test Data Generation Skill

**Feature Branch**: `001-test-data-generation`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "Create detailed specification for a test-data-generation skill"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Constraint-Valid Test Data (Priority: P1)

A developer needs realistic test data for a PostgreSQL database with complex relationships (users, orders, products, payments). They provide the database schema and request 1000 user records with associated orders. Claude analyzes the schema, identifies all constraints (foreign keys, unique constraints, NOT NULL), generates data that respects these constraints, validates the output, and delivers SQL insert statements with a validation report proving all constraints are satisfied.

**Why this priority**: This is the core value proposition - generating valid, constraint-respecting test data is the fundamental capability that makes the skill useful. Without this, the skill cannot deliver its primary function.

**Independent Test**: Can be fully tested by providing a schema with foreign key relationships, generating data, and attempting to insert it into a real database. Success means zero constraint violation errors during insertion.

**Acceptance Scenarios**:

1. **Given** a database schema with foreign key relationships, **When** user requests test data generation, **Then** all foreign keys reference existing parent records with no orphans
2. **Given** a schema with unique constraints on email fields, **When** generating 1000 user records, **Then** all 1000 email values are unique
3. **Given** a schema with NOT NULL constraints, **When** data is generated, **Then** no required fields contain null values
4. **Given** a schema with check constraints (e.g., age >= 18), **When** data is generated, **Then** all values satisfy the check conditions
5. **Given** generated test data, **When** attempting database insertion, **Then** insertion completes with zero constraint violation errors

---

### User Story 2 - Generate Production-Like Data Patterns (Priority: P2)

A QA engineer needs test data that mirrors real-world usage patterns for performance testing. They specify a schema and request data with realistic distributions (Zipf distribution for product popularity, temporal patterns for order dates, locale-appropriate addresses). Claude generates data with these characteristics, ensuring names look realistic, dates follow business patterns (more orders on weekdays), and popular products appear more frequently in orders.

**Why this priority**: Production-like patterns are essential for meaningful performance and integration testing, but the system can still function with simpler uniform distributions. This adds realism after basic validity is established.

**Independent Test**: Can be tested by analyzing the generated dataset's statistical properties - verifying distribution shapes, checking that addresses match postal code formats, confirming temporal patterns exist.

**Acceptance Scenarios**:

1. **Given** a request for e-commerce test data, **When** product references are generated, **Then** popular products appear with Zipf distribution (20% of products account for 80% of orders)
2. **Given** a request for user data with US locale, **When** addresses are generated, **Then** addresses use valid US state codes, ZIP codes match city patterns, and phone numbers follow (XXX) XXX-XXXX format
3. **Given** a request for temporal order data, **When** order timestamps are generated, **Then** more orders occur on weekdays than weekends and during business hours than overnight
4. **Given** a request for user names, **When** names are generated, **Then** names are drawn from realistic name distributions (not random character sequences)

---

### User Story 3 - Include Edge Cases for Testing (Priority: P3)

A test engineer needs data that includes boundary conditions to verify application robustness. They request test data with explicit edge case coverage. Claude generates a dataset where a configurable percentage of records include edge cases: minimum/maximum lengths, boundary dates (epoch, year 2038 problem), special characters in strings, zero/negative values, empty optional fields, and maximum allowed cardinalities in relationships.

**Why this priority**: Edge case coverage is critical for quality testing but represents a smaller portion of the dataset. This enhances test comprehensiveness after valid, realistic data is established.

**Independent Test**: Can be tested by inspecting the generated dataset and verifying that specified edge cases are present at the requested frequency (e.g., 5% of strings should be at maximum length).

**Acceptance Scenarios**:

1. **Given** a schema with VARCHAR(255) fields, **When** edge cases are requested, **Then** dataset includes strings at exactly 255 characters, 1 character, and 0 characters (empty)
2. **Given** a schema with date fields, **When** edge cases are requested, **Then** dataset includes dates at 1970-01-01 (epoch), 2038-01-19 (32-bit overflow), and far future dates
3. **Given** a schema with numeric fields, **When** edge cases are requested, **Then** dataset includes zero, negative values, and maximum valid values for the data type
4. **Given** a schema with optional relationships (nullable foreign keys), **When** edge cases are requested, **Then** some records have NULL foreign keys (orphans by design)
5. **Given** a request for 10% edge case coverage, **When** 1000 records are generated, **Then** approximately 100 records contain edge case values

---

### User Story 4 - Export Data in Multiple Formats (Priority: P4)

A developer needs test data in JSON format for application fixtures, while a DBA needs SQL for direct database loading. They request the same dataset in multiple output formats. Claude generates the data once (ensuring consistency) and provides SQL INSERT statements, JSON array format, and CSV files with headers, all representing the identical dataset.

**Why this priority**: Multi-format export adds flexibility but is secondary to data quality. Users can manually convert formats if needed, making this an enhancement rather than core functionality.

**Independent Test**: Can be tested by generating data in all three formats and verifying that the record count, key values, and relationships are identical across formats.

**Acceptance Scenarios**:

1. **Given** generated test data, **When** SQL format is requested, **Then** output includes INSERT INTO statements with proper escaping and can be executed directly
2. **Given** generated test data, **When** JSON format is requested, **Then** output is valid JSON array format with proper nesting for relationships
3. **Given** generated test data, **When** CSV format is requested, **Then** output includes header row with column names and proper quoting/escaping for special characters
4. **Given** the same dataset exported in all three formats, **When** comparing record counts and key values, **Then** all formats contain identical data

---

### Edge Cases

The following complex scenarios and their resolution strategies are documented. See [Clarifications](#clarifications) section for detailed clarification session.

- Circular/self-referencing foreign keys (e.g., Employee.managerId → Employee.id)
- Self-referencing hierarchical structures (e.g., Category.parentCategoryId)
- Check constraint conflicts with edge cases (e.g., age >= 18 but edge case needs age = 0)
- Memory limits with large volumes (e.g., 10 million records)
- Unsupported locale requests (e.g., requesting Finnish locale when only US English supported)
- Extremely large cardinalities (e.g., one user with 10,000 orders)
- Schema changes between generation requests

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Claude MUST accept database schema input in standard formats (SQL DDL, JSON schema, ORM model definitions)
- **FR-002**: Claude MUST analyze schema to identify all constraints (primary keys, foreign keys, unique, NOT NULL, check constraints, data types)
- **FR-003**: Generated data MUST satisfy all identified constraints with zero violations
- **FR-004**: Claude MUST support specifying data volume (number of records per entity)
- **FR-005**: Claude MUST perform topological sort of entities to generate parent records before children in foreign key relationships
- **FR-006**: Generated data MUST be validated against schema constraints before delivery
- **FR-007**: Claude MUST provide validation report documenting constraint satisfaction
- **FR-008**: Claude MUST support reproducible generation via seeding mechanism
- **FR-009**: Generated data MUST include realistic data patterns (names, addresses, emails, phone numbers) appropriate to specified locale (default: US English), falling back to US English with warning for unsupported locales
- **FR-010**: Claude MUST support configurable data distributions (uniform, Zipf, normal) for applicable fields
- **FR-011**: Generated data MUST include edge cases at configurable percentage (default: 5%), but MUST skip edge cases that violate schema constraints and document skipped cases in validation report
- **FR-012**: Generated data MUST be exportable in SQL INSERT format with proper escaping
- **FR-013**: Generated data MUST be exportable in JSON array format with proper nesting
- **FR-014**: Generated data MUST be exportable in CSV format with headers and proper quoting
- **FR-015**: Claude MUST document generation parameters (schema version, seed, volume, distribution settings) in output metadata
- **FR-016**: Claude MUST handle self-referencing foreign keys using tiered generation: first records (root nodes) have NULL values, subsequent records reference earlier records to create realistic hierarchies
- **FR-017**: Claude MUST respect cascade delete/update semantics when generating related records
- **FR-018**: Claude MUST automatically use streaming/batching for large datasets (>100k records) to prevent memory overflow, writing data progressively in chunks with progress reporting
- **FR-019**: Claude MUST fail gracefully with clear error messages when schema is invalid or unparseable
- **FR-020**: Claude MUST support custom value generators for domain-specific fields (e.g., custom product SKU format)

### Key Entities *(include if feature involves data)*

- **Database Schema**: Represents the structure of the target database, including tables, columns, data types, constraints, and relationships. Input provided by the user.
- **Entity Dependency Graph**: Internal representation of foreign key relationships used for topological sorting to ensure parent records are generated before children.
- **Generation Configuration**: User-specified parameters including volume (records per table), seed (for reproducibility), edge case percentage, locale, distribution types, and output formats.
- **Constraint Validator**: Component of Claude's generation workflow that verifies generated data satisfies all schema constraints (uniqueness, referential integrity, check constraints, NOT NULL, data types).
- **Data Record**: Individual generated record with values for all columns, respecting data types and constraints.
- **Validation Report**: Document proving data quality, including constraint satisfaction checks, distribution statistics, edge case coverage, and any warnings or errors.
- **Output Artifact**: Final deliverable in requested format (SQL, JSON, or CSV) containing generated data and metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Generated data loads into target database with zero constraint violation errors in 100% of test cases
- **SC-002**: Claude generates 1000 records with complex relationships (3+ tables, 5+ foreign keys) within 5 seconds
- **SC-003**: Generated datasets pass referential integrity audits with 100% of foreign keys resolving to existing parent records
- **SC-004**: Edge cases appear at the specified percentage (±2% tolerance) across all generated datasets
- **SC-005**: Validation report confirms constraint satisfaction before delivery in 100% of generation runs
- **SC-006**: Generated data with same schema and seed produces identical output on repeated runs (100% reproducibility)
- **SC-007**: Realistic pattern generation produces locale-appropriate addresses with 95%+ format correctness (valid state codes, ZIP patterns, phone formats)
- **SC-008**: Statistical distributions match specified types (Zipf, normal, uniform) within 10% deviation when analyzed
- **SC-009**: System successfully handles schemas with 20+ tables and 50+ columns without errors or memory overflow
- **SC-010**: Users can specify and generate data for custom constraints and business rules with 90%+ satisfaction in usability testing

### Quality Criteria

- **SC-011**: All generated string values respect character length constraints (minimum and maximum lengths)
- **SC-012**: All generated numeric values fall within valid ranges for their data types
- **SC-013**: All generated date/timestamp values are valid and fall within specified ranges
- **SC-014**: Output files are syntactically valid (SQL executes, JSON parses, CSV loads) in 100% of cases
- **SC-015**: Generation process is deterministic - same inputs produce same outputs every time

## Assumptions

1. **Schema Format**: Assumes schemas are provided in standard SQL DDL format (CREATE TABLE statements) unless otherwise specified. Other formats (JSON Schema, ORM models) may be supported but require explicit parsing logic.

2. **Database Compatibility**: Primary focus on PostgreSQL constraint semantics, with common patterns (foreign keys, unique, NOT NULL, check constraints) that apply across most relational databases. Database-specific features (e.g., PostgreSQL arrays, MySQL ENUM) may require special handling.

3. **Locale Support**: Default realistic data patterns assume US English locale (US addresses, English names, US phone numbers). Other locales require explicit configuration and may have limited pattern libraries initially. Unsupported locales automatically fall back to US English with warning in validation report. Note: Locale patterns are documented as examples in skill files; Claude applies these documented patterns during generation rather than calling external locale libraries.

4. **Performance Targets**: Assumes generation runs on modern hardware (4+ CPU cores, 8GB+ RAM). Large datasets (>100k records) automatically use streaming/batching to manage memory efficiently.

5. **Data Realism Level**: Realistic patterns use common libraries (Faker, existing name/address datasets) rather than sophisticated ML-based generation. Realism is "good enough for testing" not "indistinguishable from production."

6. **Edge Case Selection**: System automatically selects which edge cases to include based on data type (e.g., VARCHAR gets min/max length, dates get epoch/overflow dates). Users cannot specify exact edge cases without custom generators.

7. **Validation Scope**: Pre-delivery validation checks database constraints but not application-level business rules (e.g., "premium users must have payment method") unless explicitly specified via custom validators.

8. **Output Format**: SQL INSERT statements are formatted for readability (one statement per record) rather than optimized for bulk loading performance. Users needing optimized bulk loading may need to post-process output.

9. **Relationship Cardinality**: Assumes typical cardinalities (users have 1-10 orders, orders have 1-5 items) unless explicitly specified. Does not automatically generate extreme cardinalities (one user with 10,000 orders) without configuration.

10. **Skill Context**: This is a Claude Code skill specification, meaning Claude is being taught how to generate test data when users request it, not building an automated standalone tool. The skill guides Claude's behavior during interactive data generation tasks.

## Teaching Goals for Claude

### Core Capabilities

When this skill is invoked, Claude should understand:

1. **Primary Task**: Generate realistic, constraint-valid test data for relational databases based on provided schemas
2. **Key Principles**: Always respect database constraints, maintain referential integrity, include edge cases, and validate before delivery (per constitution)
3. **Workflow Stages**: Schema analysis → Dependency graphing → Topological generation → Validation → Multi-format export
4. **Quality Gates**: Never deliver data without validation report proving constraint satisfaction

### When to Use This Skill

Claude should recognize data generation requests through these patterns:

- "Generate test data for [database/table/schema]"
- "I need sample data with [X] records"
- "Create realistic test data for testing [feature]"
- "Generate SQL/JSON/CSV fixtures for [purpose]"
- "I need test data that respects [constraints/relationships]"
- "Create edge case data for [entity]"

### Required Inputs

Claude must request/clarify these inputs before generating data:

1. **Schema Definition** (REQUIRED): SQL DDL, JSON schema, or ORM model definitions
2. **Volume** (REQUIRED): Number of records per entity/table
3. **Output Format** (DEFAULT: SQL): SQL, JSON, CSV, or multiple formats
4. **Seed** (OPTIONAL): For reproducible generation
5. **Edge Case Percentage** (DEFAULT: 5%): How much of data should be edge cases
6. **Locale** (DEFAULT: US English): For realistic pattern generation
7. **Distribution Types** (DEFAULT: Uniform): For applicable fields (Zipf for popularity, normal for measurements, etc.)
8. **Custom Constraints** (OPTIONAL): Application-level business rules beyond database constraints
9. **Custom Value Generators** (OPTIONAL): User-provided patterns for domain-specific fields
   - Format: "For field X, use pattern Y" or "Generate field X using format ABC-####-XX"
   - Example: "For product SKU, use format ABC-####-XX where # is digit and X is uppercase letter"
   - Example: "For employee ID, use pattern EMP-{department_code}-{sequential_5_digits}"
   - Claude incorporates these patterns into generation logic for those specific fields
   - If not provided, Claude uses realistic default patterns based on field name and type

### Expected Outputs

Claude must deliver these artifacts:

1. **Generated Data File(s)**: In requested format(s), properly formatted and escaped
2. **Validation Report**: Documenting:
   - Constraint satisfaction checks (all passed)
   - Edge case coverage statistics
   - Distribution analysis (if applicable)
   - Record counts per entity
   - Generation metadata (schema version, seed, parameters)
3. **Generation Summary**: Human-readable explanation of what was generated and any notable decisions made

### Key Patterns to Follow

#### Pattern 1: Schema Analysis First

```
GOOD:
1. Parse schema
2. Extract all constraints (PK, FK, unique, NOT NULL, check, types)
3. Build dependency graph
4. Identify generation order via topological sort
5. Generate data

BAD:
1. Start generating data immediately
2. Hit foreign key violation
3. Backtrack and fix
```

#### Pattern 2: Parent Before Children

```
GOOD:
Generate Users (parent) → Generate Orders (child) → Generate OrderItems (grandchild)
All foreign keys reference existing records

BAD:
Generate Orders first → No users exist yet → Foreign key violations
```

#### Pattern 3: Validate Before Delivery

```
GOOD:
1. Generate data
2. Run constraint validation
3. Run referential integrity check
4. Produce validation report
5. Deliver data + report

BAD:
1. Generate data
2. Deliver immediately
3. User discovers constraint violations during loading
```

#### Pattern 4: Edge Cases Integrated

```
GOOD:
- 95% of records: Realistic values
- 5% of records: Edge cases (min/max length, boundary dates, nulls, extremes)
- Edge cases distributed throughout dataset

BAD:
- All records: Only happy-path realistic values
- No edge cases tested
OR
- Edge cases in separate file
- Not integrated with normal data
```

### Examples of Good vs Bad Output

#### Example 1: User Entity Generation

**GOOD OUTPUT (respects constraints, realistic, includes edge cases):**

```sql
-- Validation Report: 1000 users generated
-- Constraints: email UNIQUE NOT NULL, age CHECK (age >= 18), created_at NOT NULL
-- Edge cases: 5% (50 records) include min/max ages, max-length names, special chars
-- Seed: 42 (reproducible)

INSERT INTO users (id, email, name, age, created_at) VALUES
  (1, 'sarah.chen@example.com', 'Sarah Chen', 34, '2024-03-15 10:23:45'),
  (2, 'james.williams@example.com', 'James Williams', 28, '2024-06-22 14:30:12'),
  (3, 'maria.garcia@example.com', 'Maria Garcia', 45, '2023-11-08 09:15:33'),
  -- ... 944 more realistic records ...
  (948, 'edge.case.user.with.maximum.length.name.exactly.fifty.chars@example.com',
        'Abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 18, '1970-01-01 00:00:00'), -- Edge: min age, epoch date, max lengths
  (949, 'test+special$chars@example.com', 'O''Brien', 105, '2024-12-31 23:59:59'), -- Edge: special chars, max realistic age
  -- ... 48 more edge cases ...
  (1000, 'final.user@example.com', 'Final User', 30, '2024-08-19 12:00:00');

-- Validation: ✓ All emails unique (1000/1000)
-- Validation: ✓ All ages >= 18 (1000/1000)
-- Validation: ✓ No NULL values in required fields (1000/1000)
-- Validation: ✓ Edge case coverage: 5.0% (50/1000)
```

**BAD OUTPUT (constraint violations, unrealistic, no edge cases):**

```sql
-- No validation report
-- No metadata

INSERT INTO users (id, email, name, age, created_at) VALUES
  (1, 'user1@test.com', 'User 1', 25, '2024-01-01'), -- BAD: Unrealistic name pattern
  (2, 'user2@test.com', 'User 2', 30, '2024-01-01'), -- BAD: Duplicate created_at
  (3, 'user1@test.com', 'User 3', 15, NULL),         -- BAD: Duplicate email, age < 18, NULL created_at
  (4, NULL, 'User 4', -5, '2024-01-01'),             -- BAD: NULL email, negative age
  -- ... more bad data with no edge cases, constraint violations, unrealistic patterns
```

#### Example 2: Foreign Key Relationships

**GOOD OUTPUT (referential integrity maintained):**

```sql
-- Generated in topological order: Users → Orders → OrderItems

-- Users (parent)
INSERT INTO users (id, email) VALUES
  (1, 'alice@example.com'),
  (2, 'bob@example.com');

-- Orders (child, references users)
INSERT INTO orders (id, user_id, total, status) VALUES
  (1, 1, 150.00, 'completed'),  -- References user 1 (exists)
  (2, 1, 75.50, 'pending'),     -- References user 1 (exists)
  (3, 2, 200.00, 'completed');  -- References user 2 (exists)

-- OrderItems (grandchild, references orders)
INSERT INTO order_items (id, order_id, product_name, quantity) VALUES
  (1, 1, 'Widget', 2),   -- References order 1 (exists)
  (2, 1, 'Gadget', 1),   -- References order 1 (exists)
  (3, 2, 'Doohickey', 3); -- References order 2 (exists)

-- Validation: ✓ All foreign keys resolve (5/5 orders.user_id, 3/3 order_items.order_id)
```

**BAD OUTPUT (broken relationships):**

```sql
-- Generated in wrong order or with invalid references

-- Orders (child generated before parent!)
INSERT INTO orders (id, user_id, total) VALUES
  (1, 1, 150.00),  -- References user 1 (doesn't exist yet!)
  (2, 99, 75.50);  -- References user 99 (never created!)

-- Users (parent generated after child)
INSERT INTO users (id, email) VALUES
  (1, 'alice@example.com');
  -- User 99 never created!

-- OrderItems (orphans)
INSERT INTO order_items (id, order_id, quantity) VALUES
  (1, 999, 2);  -- References non-existent order 999

-- No validation report showing broken references
```

#### Example 3: Multi-Format Export

**GOOD OUTPUT (same data, multiple formats, consistent):**

**SQL:**
```sql
INSERT INTO products (id, name, price) VALUES
  (1, 'Laptop', 999.99),
  (2, 'Mouse', 29.99);
```

**JSON:**
```json
[
  {"id": 1, "name": "Laptop", "price": 999.99},
  {"id": 2, "name": "Mouse", "price": 29.99}
]
```

**CSV:**
```csv
id,name,price
1,Laptop,999.99
2,Mouse,29.99
```

**Validation: ✓ All formats contain identical data (2 records, matching IDs and values)**

**BAD OUTPUT (inconsistent across formats):**

SQL has 3 records, JSON has 2 records, CSV has different values - formats don't match!

---

## Clarifications

### Session 2026-01-04

- Q: How should users activate this skill - explicit slash command or auto-detection? → A: Auto-detect only - Claude recognizes data generation patterns without explicit slash command
- Q: How should circular/self-referencing foreign keys be resolved (e.g., Employee.managerId)? → A: Tiered generation - first N records have NULL, subsequent records reference earlier records to create realistic hierarchies
- Q: What happens when check constraints conflict with edge case requirements (e.g., age >= 18 but edge case needs age = 0)? → A: Constraint always wins - skip conflicting edge cases, document in validation report
- Q: How should memory limits be handled for large datasets (e.g., 10 million records)? → A: Automatic streaming/batching - generate and write data in chunks progressively to files
- Q: What happens when unsupported locales are requested? → A: Fallback to US English locale with warning in validation report

## Notes

- This specification describes teaching Claude how to generate test data, not building an automated tool
- Claude will use this specification as guidance when users request data generation
- The constitution principles (constraint compliance, referential integrity, edge cases, validation) are mandatory gates
- Claude should automatically recognize data generation requests through pattern matching (see "When to Use This Skill" section)
- Generated data is for testing purposes only, not production use
- Privacy note: Generated data should use synthetic values, not real personal information
