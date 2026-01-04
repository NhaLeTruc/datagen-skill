# Workflow 4: Validation

**Purpose**: Pre-delivery validation ensuring 100% constraint satisfaction before data delivery

**Input**: Generated dataset from [Data Generation (Workflow 3)](03-data-generation.md)

**Output**: Validation report + validated dataset (only if ALL checks pass)

---

## Constitutional Mandate

**Principle V (NON-NEGOTIABLE)**: All generated data MUST be validated prior to use.

- ✅ If validation passes → Deliver data + validation report
- ❌ If validation fails → **NO DATA DELIVERED**, report errors

---

## Validation Checklist

Run ALL checks in sequence. If ANY check fails, STOP and report.

---

## Check 1: Schema Conformance

**Verify**: Generated data structure matches schema definition

### 1a. Table Existence

```python
for table_name in dataset.keys():
    assert table_name in schema.tables, f"Extra table in dataset: {table_name}"

for table_name in schema.tables:
    if table_name not in dataset:
        warnings.append(f"Table '{table_name}' in schema but not in dataset")
```

**Example**:
```text
✓ Schema tables: [users, products, orders, order_items]
✓ Dataset tables: [users, products, orders, order_items]
✓ PASS: All tables match
```

### 1b. Column Existence

```python
for table in dataset:
    schema_columns = schema.tables[table].columns
    for record in dataset[table]:
        for col in record.keys():
            assert col in schema_columns, f"Extra column: {table}.{col}"

    for col in schema_columns:
        if col not in record.keys():
            if not col.has_default:
                errors.append(f"Missing required column: {table}.{col}")
```

**Example**:
```text
✓ users: columns [id, email, name, age] match schema
✓ orders: columns [id, user_id, total, status] match schema
✓ PASS: All columns match
```

### 1c. Data Type Conformance

```python
for table in dataset:
    for record in dataset[table]:
        for col, value in record.items():
            expected_type = schema.tables[table].columns[col].data_type
            if not isinstance(value, expected_type):
                errors.append(f"Type mismatch: {table}.{col} expected {expected_type}, got {type(value)}")
```

**Example**:
```text
✓ users.id: INT (all values are integers)
✓ users.email: VARCHAR (all values are strings)
✓ orders.total: DECIMAL (all values are floats/decimals)
✓ PASS: All data types match
```

**Result**: ✓ or ✗

---

## Check 2: Constraint Satisfaction

**Verify**: All database constraints satisfied with zero violations

### 2a. Primary Key Constraints

**Check**: All PKs unique and non-null

```python
for table in dataset:
    pk_column = schema.tables[table].primary_key
    pk_values = [record[pk_column] for record in dataset[table]]

    # Check uniqueness
    unique_pks = set(pk_values)
    if len(unique_pks) != len(pk_values):
        duplicates = len(pk_values) - len(unique_pks)
        errors.append(f"✗ Primary keys: {len(unique_pks)}/{len(pk_values)} unique ({duplicates} duplicates)")
    else:
        print(f"✓ Primary keys: All unique ({len(pk_values)}/{len(pk_values)})")

    # Check non-null
    null_count = sum(1 for v in pk_values if v is None)
    if null_count > 0:
        errors.append(f"✗ Primary keys: {null_count} NULL values found (must be non-null)")
```

**Example**:
```text
✓ users.id: All unique (1000/1000), no NULLs
✓ products.id: All unique (200/200), no NULLs
✓ orders.id: All unique (2500/2500), no NULLs
```

### 2b. Foreign Key Constraints

**Check**: All FKs resolve to existing parent records

```python
for table in dataset:
    for fk in schema.tables[table].foreign_keys:
        child_column = fk.column
        parent_table = fk.references_table
        parent_column = fk.references_column

        # Get parent PK values
        parent_pks = set(record[parent_column] for record in dataset[parent_table])

        # Check all FK values resolve
        for record in dataset[table]:
            fk_value = record[child_column]
            if fk_value is not None and fk_value not in parent_pks:
                errors.append(f"✗ FK violation: {table}.{child_column}={fk_value} references non-existent {parent_table}.{parent_column}")

    print(f"✓ Foreign keys: All resolve ({total_fk_values}/{total_fk_values})")
```

**Example**:
```text
✓ orders.user_id: All resolve to users.id (2500/2500)
✓ order_items.order_id: All resolve to orders.id (5000/5000)
✓ order_items.product_id: All resolve to products.id (5000/5000)
```

### 2c. Unique Constraints

**Check**: No duplicates in constrained columns

```python
for table in dataset:
    for unique_col in schema.tables[table].unique_constraints:
        values = [record[unique_col] for record in dataset[table] if record[unique_col] is not None]
        unique_values = set(values)

        if len(unique_values) != len(values):
            duplicates = len(values) - len(unique_values)
            errors.append(f"✗ Unique constraint: {table}.{unique_col} has {duplicates} duplicates")
        else:
            print(f"✓ Unique constraint: {table}.{unique_col} all unique ({len(values)}/{len(values)})")
```

**Example**:
```text
✓ users.email: All unique (1000/1000)
✓ products.sku: All unique (200/200)
```

### 2d. NOT NULL Constraints

**Check**: No NULLs in required fields

```python
for table in dataset:
    for not_null_col in schema.tables[table].not_null_columns:
        null_count = sum(1 for record in dataset[table] if record[not_null_col] is None)

        if null_count > 0:
            errors.append(f"✗ NOT NULL: {table}.{not_null_col} has {null_count} NULL values")
        else:
            print(f"✓ NOT NULL: {table}.{not_null_col} no NULLs ({len(dataset[table])}/{len(dataset[table])})")
```

**Example**:
```text
✓ users.email: No NULLs (1000/1000)
✓ users.name: No NULLs (1000/1000)
✓ orders.user_id: No NULLs (2500/2500)
```

### 2e. Check Constraints

**Check**: All check conditions satisfied

```python
for table in dataset:
    for check in schema.tables[table].check_constraints:
        violations = []
        for record in dataset[table]:
            if not evaluate_check_condition(record, check.condition):
                violations.append(record)

        if len(violations) > 0:
            errors.append(f"✗ Check constraint: {table} CHECK ({check.condition}) violated by {len(violations)} records")
        else:
            print(f"✓ Check constraint: {table} CHECK ({check.condition}) all satisfied ({len(dataset[table])}/{len(dataset[table])})")
```

**Example**:
```text
✓ users CHECK (age >= 18): All satisfied (1000/1000)
✓ orders CHECK (total >= 0): All satisfied (2500/2500)
✓ orders CHECK (status IN ('pending', 'completed', 'cancelled')): All satisfied (2500/2500)
```

### 2f. Data Type Length/Precision

**Check**: VARCHAR lengths, DECIMAL precision/scale

```python
for table in dataset:
    for col, col_def in schema.tables[table].columns.items():
        if col_def.data_type == 'VARCHAR':
            max_length = col_def.max_length
            for record in dataset[table]:
                value = record[col]
                if value is not None and len(value) > max_length:
                    errors.append(f"✗ Length violation: {table}.{col} value '{value}' exceeds max length {max_length}")

        elif col_def.data_type == 'DECIMAL':
            precision = col_def.precision
            scale = col_def.scale
            for record in dataset[table]:
                value = record[col]
                if value is not None:
                    # Check precision and scale
                    if not matches_decimal_precision(value, precision, scale):
                        errors.append(f"✗ Precision violation: {table}.{col} value {value} exceeds DECIMAL({precision},{scale})")
```

**Example**:
```text
✓ users.email: All values ≤ 255 chars (1000/1000)
✓ orders.total: All values match DECIMAL(10,2) (2500/2500)
```

**Result**: ✓ or ✗ for each constraint type

---

## Check 3: Referential Integrity Audit

**Verify**: Relationships internally consistent, no orphans

### 3a. Orphan Check

**Check**: No orphaned records (all FKs resolve)

```python
orphan_count = 0
for table in dataset:
    for fk in schema.tables[table].foreign_keys:
        if not fk.nullable:  # NOT NULL FKs must resolve
            # Already checked in Check 2b
            continue

        # Check nullable FKs: Count intentional NULLs vs orphans
        for record in dataset[table]:
            if record[fk.column] is None:
                # This is intentional NULL (not an orphan)
                continue
            elif record[fk.column] not in parent_pks:
                orphan_count += 1

if orphan_count > 0:
    errors.append(f"✗ Orphan check: {orphan_count} orphaned records found")
else:
    print("✓ Orphan check: No orphaned records")
```

**Example**:
```text
✓ Orphan check: No orphaned records (all FKs resolve or intentionally NULL)
```

### 3b. Cascade Semantics Verification

**Check**: Relationships respect cascade rules

```python
for table in dataset:
    for fk in schema.tables[table].foreign_keys:
        if fk.on_delete == 'CASCADE':
            # Verify child records would be deleted if parent deleted
            # (This is informational, not blocking)
            print(f"ℹ ON DELETE CASCADE: {table}.{fk.column} → {fk.references_table}.{fk.references_column}")

        elif fk.on_delete == 'SET NULL':
            # Verify FK is nullable (required for SET NULL)
            if not fk.nullable:
                errors.append(f"✗ Cascade semantic error: {table}.{fk.column} has ON DELETE SET NULL but is NOT NULL")
```

**Example**:
```text
✓ Cascade semantics: All ON DELETE CASCADE/SET NULL FKs correctly configured
```

### 3c. Hierarchy Validity (Self-Referencing FKs)

**Check**: Self-referencing structures form valid trees/DAGs

```python
for table in dataset:
    for fk in schema.tables[table].foreign_keys:
        if fk.references_table == table:  # Self-referencing
            # Check for cycles
            cycles = detect_cycles_in_self_reference(dataset[table], fk.column)
            if len(cycles) > 0:
                errors.append(f"✗ Hierarchy cycle detected in {table}.{fk.column}")
            else:
                print(f"✓ Hierarchy validity: {table}.{fk.column} forms valid tree (no cycles)")
```

**Example**:
```text
✓ employees.manager_id: Forms valid organizational hierarchy (no cycles)
```

**Result**: ✓ or ✗

---

## Check 4: Edge Case Coverage

**Verify**: Edge cases present at specified percentage (±2% tolerance)

### 4a. Count Edge Case Records

```python
edge_case_records = count_records_with_edge_cases(dataset)
total_records = sum(len(dataset[table]) for table in dataset)

actual_percentage = edge_case_records / total_records * 100
target_percentage = generation_metadata['edge_case_percentage'] * 100

tolerance = 2.0  # ±2%
if abs(actual_percentage - target_percentage) > tolerance:
    warnings.append(f"⚠ Edge case coverage: {actual_percentage:.1f}% (target: {target_percentage}% ±{tolerance}%)")
else:
    print(f"✓ Edge case coverage: {actual_percentage:.1f}% (target: {target_percentage}%)")
```

**Example**:
```text
✓ Target: 5% | Actual: 5.1% (444/8700 total records)
  Within tolerance (±2%)
```

### 4b. Verify Edge Case Types

**Check**: Type-specific edge cases included

```python
edge_cases_found = {
    'min_length_strings': count_min_length_strings(dataset),
    'max_length_strings': count_max_length_strings(dataset),
    'boundary_dates': count_boundary_dates(dataset),
    'zero_values': count_zero_values(dataset),
    'null_optionals': count_null_optionals(dataset),
    'special_characters': count_special_characters(dataset),
}

for edge_type, count in edge_cases_found.items():
    print(f"✓ {edge_type}: {count} records")
```

**Example**:
```text
✓ Min/max length strings (VARCHAR fields): 87 records
✓ Boundary dates (1970-01-01, 2038-01-19): 43 records
✓ Special characters in strings: 102 records
✓ Zero/boundary numeric values: 89 records
✓ NULL in optional fields: 123 records
```

### 4c. Document Skipped Edge Cases

**List**: Edge cases skipped due to constraint conflicts

```python
if len(skipped_edge_cases) > 0:
    print(f"ℹ Skipped edge cases (constraint conflicts): {len(skipped_edge_cases)}")
    for skipped in skipped_edge_cases:
        print(f"  - {skipped}")
else:
    print("✓ No edge cases skipped")
```

**Example**:
```text
ℹ Skipped edge cases (constraint conflicts):
  - age = 0 violates CHECK (age >= 18)
  - status = 'invalid' violates CHECK (status IN (...))
```

**Result**: ✓ or ⚠

---

## Check 5: Distribution Analysis (if configured)

**Verify**: Statistical distributions match specifications (±10% tolerance)

### 5a. Zipf Distribution Verification

```python
if 'zipf' in generation_metadata['distributions']:
    # Verify 20% of entities account for ~80% of references
    top_20_percent_count = int(len(entities) * 0.2)
    top_entities = sorted(entities, key=lambda e: e.reference_count, reverse=True)[:top_20_percent_count]
    top_references = sum(e.reference_count for e in top_entities)
    total_references = sum(e.reference_count for e in entities)

    actual_percentage = top_references / total_references * 100
    target_percentage = 80.0
    tolerance = 10.0  # ±10%

    if abs(actual_percentage - target_percentage) > tolerance:
        warnings.append(f"⚠ Zipf distribution: 20% of entities → {actual_percentage:.1f}% of references (target: 80% ±10%)")
    else:
        print(f"✓ Zipf distribution: 20% of entities → {actual_percentage:.1f}% of references (target: 80%)")
```

**Example**:
```text
✓ Zipf (product popularity): 20% of products → 79% of orders (target: 80%, ±10% OK)
```

### 5b. Normal Distribution Verification

```python
if 'normal' in generation_metadata['distributions']:
    # Verify mean and std dev within expected ranges
    import statistics
    values = [record[col] for record in dataset[table]]
    mean = statistics.mean(values)
    std_dev = statistics.stdev(values)

    print(f"✓ Normal distribution: mean={mean:.2f}, std_dev={std_dev:.2f}")
```

**Example**:
```text
✓ Normal (order totals): mean=100.23, std_dev=29.87 (expected: mean=100, std_dev=30)
```

**Result**: ✓ or ⚠

---

## Check 6: Required Field Completeness

**Verify**: No unexpected NULLs in generated data

```python
for table in dataset:
    for col in schema.tables[table].columns:
        if not col.nullable and col not in schema.tables[table].columns_with_defaults:
            null_count = sum(1 for record in dataset[table] if record[col] is None)
            if null_count > 0:
                errors.append(f"✗ Unexpected NULL: {table}.{col} has {null_count} NULL values (should be NOT NULL)")
```

**Example**:
```text
✓ All required fields populated (no unexpected NULLs)
```

**Result**: ✓ or ✗

---

## Validation Report Generation

After all checks complete, generate validation report using [Validation Report template](../templates/validation-report.md):

```text
VALIDATION REPORT
=================
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

---

## Delivery Decision

### If ALL Checks Pass (✓ PASS)

**Deliver**:
1. Generated data file(s) in requested format(s)
2. Validation report (as shown above)
3. Generation summary (human-readable)

**Constitutional Principle V satisfied**: Data validated before delivery ✓

### If ANY Check Fails (✗ FAIL)

**DO NOT DELIVER DATA**

**Deliver instead**:
1. Validation report showing failed checks
2. Clear error message explaining failures
3. Suggested corrective actions

**Example Error Report**:
```text
VALIDATION RESULT: ✗ FAIL - Data NOT delivered due to constraint violations

Failed Checks:
- ✗ Primary keys: users.id has 5 duplicates (995/1000 unique)
- ✗ Foreign keys: orders.user_id has 12 FK violations (references non-existent users)

Corrective Actions:
1. Fix PK generation logic to ensure uniqueness
2. Verify FK pool contains valid user IDs before generating orders

Data generation aborted. No data files delivered.
```

**Constitutional Principle V enforced**: Invalid data NEVER delivered ✓

---

## Next Step

If validation passes: Proceed to [Workflow 5: Export Formats](05-export-formats.md) to serialize data to SQL/JSON/CSV

---

## Examples

See validation reports in action:
- **[Users Table](../examples/basic/users-table.md)**: Validation report for simple schema
- **[E-Commerce Schema](../examples/intermediate/ecommerce-schema.md)**: Validation report for multi-table schema with 100% constraint satisfaction

---

**Related**:
- **Previous Workflow**: [Data Generation](03-data-generation.md)
- **Next Workflow**: [Export Formats](05-export-formats.md)
- **Template**: [Validation Report](../templates/validation-report.md)
- **Guideline**: [Constitution Alignment](../guidelines/constitution-alignment.md) - Principle V

---

**Last Updated**: 2026-01-04
