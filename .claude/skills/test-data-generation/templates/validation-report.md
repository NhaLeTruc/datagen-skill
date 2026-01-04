# Template: Validation Report

**Purpose**: Standard format for validation reports that accompany generated test data

**Constitutional Principle**: Principle V - Pre-Delivery Validation (Quality Assurance)

---

## Overview

Every generated dataset MUST include a validation report that proves:
1. **Constraint Satisfaction**: All database constraints satisfied (0% violation rate)
2. **Referential Integrity**: All foreign keys resolve to existing parents
3. **Edge Case Coverage**: Edge cases integrated at requested percentage
4. **Distribution Analysis**: Statistical properties match requirements
5. **Reproducibility**: Seed and parameters recorded for reproduction

---

## Template Structure

```markdown
# Validation Report: [Schema Name]

## Generation Metadata

- **Seed**: [seed_value]
- **Timestamp**: [YYYY-MM-DD HH:MM:SS UTC]
- **Record Count**: [total_records] OR [table1:count1, table2:count2, ...]
- **Schema**: [schema_name]
- **Generator Version**: [version]
- **Edge Case Coverage**: [percentage]%

## Constraint Satisfaction Checks

### [Table 1]

#### Primary Key ([column_name])

- ✅/❌ All PKs unique: [list or range]
- ✅/❌ All PKs non-null
- ✅/❌ [Additional PK-specific checks]

#### Foreign Key ([fk_column_name] → [parent_table].[parent_column])

- ✅/❌ All FKs resolve to existing parents
- ✅/❌ FK pool: [list or range]
- ✅/❌ Used FKs: [list or summary]
- ✅/❌ Resolution rate: [X]%
- ✅/❌ Orphan records: [count] (should be 0)

#### Unique ([column_name])

- ✅/❌ All values unique: [count] unique values from [total] records
- ✅/❌ Duplicates: [count] (should be 0)
- ✅/❌ NULL values: [count] (if column is nullable)

#### NOT NULL ([column_name])

- ✅/❌ All [count] records have non-null [column_name]
- ✅/❌ NULL count: [count] (should be 0)

#### Check Constraint ([constraint_name]: [condition])

- ✅/❌ All [count] values satisfy constraint: [condition]
- ✅/❌ Value range in dataset: [min] to [max]
- ✅/❌ Violations: [count] (should be 0)

#### Data Type ([column_name]: [data_type])

- ✅/❌ All values match type [data_type]
- ✅/❌ [Type-specific checks: length, precision, scale, range]
- ✅/❌ Max length in dataset: [X] chars (for VARCHAR/CHAR)
- ✅/❌ Precision/scale: [X,Y] (for DECIMAL/NUMERIC)

### [Table 2]
[Repeat constraint checks for each table]

## Referential Integrity Audit

| FK Relationship | Source → Target | Records | Resolution | Status |
|----------------|----------------|---------|------------|--------|
| [table1] → [table2] | [table1].[fk_col] → [table2].[pk_col] | [count] | [resolved]/[total] ([percentage]%) | ✅/❌ |
| [table3] → [table4] | [table3].[fk_col] → [table4].[pk_col] | [count] | [resolved]/[total] ([percentage]%) | ✅/❌ |

**Summary**: [X]% referential integrity - [Y] orphan records

**Expected**: 100% referential integrity - 0 orphan records

## Edge Case Coverage

### Edge Cases Integrated

| Data Type | Edge Case | Count | Percentage | Example Record |
|-----------|-----------|-------|------------|----------------|
| VARCHAR | Min length (0 or 1) | [count] | [X]% | [record_id] |
| VARCHAR | Max length | [count] | [X]% | [record_id] |
| VARCHAR | Special characters | [count] | [X]% | [record_id] |
| INT | Zero | [count] | [X]% | [record_id] |
| INT | Negative | [count] | [X]% | [record_id] |
| INT | Max value | [count] | [X]% | [record_id] |
| DATE | Epoch (1970-01-01) | [count] | [X]% | [record_id] |
| DATE | Y2K38 (2038-01-19) | [count] | [X]% | [record_id] |
| DECIMAL | Zero (0.00) | [count] | [X]% | [record_id] |
| DECIMAL | Max precision | [count] | [X]% | [record_id] |
| BOOLEAN | true | [count] | [X]% | [record_id] |
| BOOLEAN | false | [count] | [X]% | [record_id] |
| NULL | Nullable fields | [count] | [X]% | [record_id] |

**Total Edge Cases**: [count] / [total_records] ([X]%)
**Target**: [target_percentage]%

### Edge Cases Skipped (Constraint Conflicts)

| Edge Case | Reason Skipped | Constraint |
|-----------|----------------|------------|
| age = 0 | Violates CHECK constraint | age >= 18 |
| price = -1.00 | Violates CHECK constraint | price >= 0 |
| [edge_case] | [reason] | [constraint] |

**Note**: Constraint compliance takes precedence over edge case coverage (Constitutional Principle I).

## Distribution Analysis

### [Column Name 1] Distribution

**Type**: [Uniform / Normal / Zipf / Custom]

**Parameters**: [e.g., mean=50, stddev=10 for Normal; alpha=1.5 for Zipf]

**Statistics**:
- Min: [value]
- Max: [value]
- Mean: [value]
- Median: [value]
- Std Dev: [value]

**Histogram**:
```
[range1]: [count] ([percentage]%) [bar visualization]
[range2]: [count] ([percentage]%) [bar visualization]
[range3]: [count] ([percentage]%) [bar visualization]
```

**Validation**: ✅/❌ Distribution matches expected [distribution_type]

### [Column Name 2] Distribution
[Repeat for other relevant columns]

### Temporal Patterns (if applicable)

**created_at Distribution**:
- [Year 1]: [count] records
- [Year 2]: [count] records
- [Year 3]: [count] records

**Weekday Distribution** (if applicable):
- Monday-Friday: [count] ([percentage]%)
- Saturday-Sunday: [count] ([percentage]%)

**Validation**: ✅/❌ Temporal patterns realistic

## Warnings

### Critical Warnings

**None** OR:
- ⚠️ [Critical issue description]
- ⚠️ [Critical issue description]

### Non-Critical Warnings

**None** OR:
- ℹ️ [Non-critical note]
- ℹ️ [Non-critical note]

## Reproducibility

To regenerate this exact dataset:

\`\`\`bash
generate_data --schema [schema_file] --seed [seed] --count [count] [other_params]
\`\`\`

**Guarantee**: Same seed ([seed]) + same schema → identical output

### Reproducibility Validation

- ✅/❌ Reproducibility test passed
- ✅/❌ Verification: Generated dataset twice with same seed - outputs [identical/different]

## Summary

| Aspect | Expected | Actual | Status |
|--------|----------|--------|--------|
| **Constraint Violations** | 0 | [count] | ✅/❌ |
| **Referential Integrity** | 100% | [percentage]% | ✅/❌ |
| **Edge Case Coverage** | [target]% | [actual]% | ✅/❌ |
| **Reproducibility** | Pass | [Pass/Fail] | ✅/❌ |
| **Distribution Matching** | Pass | [Pass/Fail] | ✅/❌ |

**Overall Status**: ✅ READY FOR DELIVERY / ❌ NEEDS FIXES

## Delivery Checklist

- [x] All database constraints satisfied (0% violation rate)
- [x] 100% referential integrity (no orphan records)
- [x] Edge cases integrated at [X]% (matches target [Y]%)
- [x] Distributions match requirements ([uniform/normal/zipf/...])
- [x] Seed recorded for reproducibility
- [x] Validation report generated
- [x] No critical warnings

---

**Generated by**: Test Data Generation Skill v[version]
**Report Date**: [YYYY-MM-DD HH:MM:SS UTC]
```

---

## Section Descriptions

### 1. Generation Metadata

**Purpose**: Record parameters for reproducibility

**Required Fields**:
- **Seed**: Exact seed value for RNG
- **Timestamp**: When data was generated
- **Record Count**: Total or per-table counts
- **Schema**: Schema name/file
- **Generator Version**: Skill version
- **Edge Case Coverage**: Target percentage

---

### 2. Constraint Satisfaction Checks

**Purpose**: Prove all database constraints satisfied

**Per Constraint Type**:
- **Primary Key**: Uniqueness, non-null
- **Foreign Key**: Resolution rate, orphans
- **Unique**: Duplicate check
- **NOT NULL**: Null count
- **Check**: Violation count
- **Data Type**: Type-specific validation

**Status Indicators**:
- ✅ Pass (constraint satisfied)
- ❌ Fail (constraint violated)

---

### 3. Referential Integrity Audit

**Purpose**: Verify all FKs resolve to existing parents

**Table Format**:
- Source → Target relationship
- Resolution rate (should be 100%)
- Orphan count (should be 0)

**Summary**:
- Overall referential integrity percentage
- Total orphan records

---

### 4. Edge Case Coverage

**Purpose**: Document edge cases integrated

**Two Subsections**:
1. **Edge Cases Integrated**: Which edge cases, count, percentage
2. **Edge Cases Skipped**: Which edge cases skipped due to constraint conflicts

**Constitutional Principle**: Constraint compliance > edge case coverage

---

### 5. Distribution Analysis

**Purpose**: Validate statistical properties

**Per Distribution**:
- Type (Uniform, Normal, Zipf)
- Parameters (mean, stddev, alpha)
- Statistics (min, max, mean, median, stddev)
- Histogram visualization
- Validation status

---

### 6. Warnings

**Purpose**: Alert to potential issues

**Two Categories**:
1. **Critical Warnings**: Block delivery (e.g., constraint violations)
2. **Non-Critical Warnings**: Informational (e.g., rounding differences)

---

### 7. Reproducibility

**Purpose**: Enable exact reproduction

**Required**:
- Command to regenerate dataset
- Guarantee statement
- Reproducibility test result

---

### 8. Summary

**Purpose**: At-a-glance validation status

**Table Format**:
- Expected vs Actual for each aspect
- Pass/Fail status

**Overall Status**:
- ✅ READY FOR DELIVERY
- ❌ NEEDS FIXES

---

### 9. Delivery Checklist

**Purpose**: Final pre-delivery checklist

**All Must Be Checked**:
- Constraints satisfied
- Referential integrity 100%
- Edge cases at target percentage
- Distributions match requirements
- Seed recorded
- Validation report generated
- No critical warnings

---

## Example Usage

See complete validation reports in:
- **[Users Table](../examples/basic/users-table.md#validation-report)**: Basic single-table validation
- **[Products Table](../examples/basic/products-table.md#validation-report)**: DECIMAL and CHECK constraints
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md#validation-report)**: Multi-table referential integrity

---

## Validation Report Anti-Patterns

### ❌ DON'T: Omit Seed

```markdown
## Generation Metadata
- Record Count: 1000
- Schema: users
```

**Problem**: Cannot reproduce dataset

**Fix**: Always include seed

---

### ❌ DON'T: Skip Constraint Checks

```markdown
## Constraint Satisfaction Checks

All constraints satisfied ✅
```

**Problem**: No proof of compliance

**Fix**: Document each constraint type with specific checks

---

### ❌ DON'T: Report Violations Without Details

```markdown
Check Constraints: ❌ 5 violations
```

**Problem**: Cannot debug or fix

**Fix**: List which records violate which constraints

---

### ❌ DON'T: Ignore Orphan Records

```markdown
Foreign Keys: ✅ All FKs exist
```

**Problem**: Orphans may still exist if FK pool incomplete

**Fix**: Explicitly check resolution rate and orphan count

---

### ❌ DON'T: Missing Edge Case Documentation

```markdown
Edge Case Coverage: 5%
```

**Problem**: Which edge cases? Which skipped?

**Fix**: List integrated edge cases and skipped edge cases with reasons

---

## Constitutional Alignment

| Principle | How Validation Report Enforces It |
|-----------|-----------------------------------|
| **I. Constraint Compliance** | Constraint satisfaction section proves 0% violation rate |
| **II. Referential Integrity** | Referential integrity audit proves 100% FK resolution |
| **III. Realistic Patterns** | Distribution analysis validates production-like data |
| **IV. Edge Case Coverage** | Edge case section documents coverage percentage |
| **V. Pre-Delivery Validation** | Entire report = validation before delivery |

**See**: [Constitution Alignment](../guidelines/constitution-alignment.md)

---

## Related

- **Workflows**: [Validation](../workflows/04-validation.md)
- **Examples**: [Users Table](../examples/basic/users-table.md), [E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)
- **Patterns**: [Reproducibility](../patterns/reproducibility.md), [Constraint Handling](../patterns/constraint-handling.md)

---

**Last Updated**: 2026-01-04
