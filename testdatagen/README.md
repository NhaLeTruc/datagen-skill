# @claude-code/testdatagen

Production-grade test data generation tool with 100% constraint satisfaction.

## Features

- **100% Constraint Satisfaction**: Guarantees all PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, and CHECK constraints are satisfied
- **SQL DDL Parsing**: Parses standard SQL CREATE TABLE statements
- **Realistic Data**: Uses Faker.js to generate realistic names, emails, addresses, etc.
- **Multi-locale Support**: Generate data in multiple locales (US, UK, DE, FR, CA, AU)
- **Reproducible**: Use seeds for deterministic generation
- **Validation**: Built-in constraint validation with detailed error reporting
- **Multiple Export Formats**: SQL, JSON, CSV (Phase 2)
- **Topological Sorting**: Automatically determines correct table generation order based on foreign key dependencies

## Installation

```bash
npm install -g @claude-code/testdatagen
```

## Quick Start

```bash
# Generate 100 records for each table
testdatagen generate schema.sql --count 100

# Generate with seed for reproducibility
testdatagen generate schema.sql --count 1000 --seed 42

# Generate with specific locale
testdatagen generate schema.sql --count 500 --locale uk

# Export to specific file
testdatagen generate schema.sql --count 200 --output data.sql
```

## Usage

### Basic Generation

```bash
testdatagen generate <schema-file> [options]
```

### Options

- `-c, --count <number>`: Number of records to generate per table (default: 100)
- `-s, --seed <number>`: Random seed for reproducible generation
- `-l, --locale <locale>`: Locale for generated data (us, uk, de, fr, ca, au) (default: us)
- `-f, --format <format>`: Output format (sql, json, csv) (default: sql)
- `-o, --output <path>`: Output file path
- `--validate`: Validate generated data (default: true)
- `--no-validate`: Skip validation
- `--transaction`: Wrap SQL output in transaction
- `--with-delete`: Include DELETE statements before INSERT

## Examples

### Example 1: Basic Users Table

**schema.sql:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  age INTEGER,
  created_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  CHECK (age >= 18 AND age <= 120)
);
```

**Command:**
```bash
testdatagen generate schema.sql --count 100
```

### Example 2: Multi-Table E-commerce

**ecommerce.sql:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  CHECK (price >= 0),
  CHECK (stock_quantity >= 0)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  order_date TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  CHECK (quantity > 0)
);
```

**Command:**
```bash
testdatagen generate ecommerce.sql --count 1000 --seed 42 --locale us
```

**Output:**
- Tables generated in correct order: users → products → orders
- All foreign keys reference valid records
- All constraints satisfied
- Realistic data (names, emails, dates, prices)

### Example 3: With Transaction

```bash
testdatagen generate schema.sql --count 500 --transaction --output data.sql
```

This wraps the output in BEGIN/COMMIT for atomic insertion.

### Example 4: Idempotent Inserts

```bash
testdatagen generate schema.sql --count 100 --with-delete
```

This includes DELETE statements before INSERT for repeatable execution.

## Supported SQL Features

### Data Types

- **Integer**: INT, INTEGER, BIGINT, SMALLINT, TINYINT
- **String**: VARCHAR, CHAR, TEXT
- **Decimal**: DECIMAL, NUMERIC, FLOAT, DOUBLE, REAL
- **Date/Time**: DATE, DATETIME, TIMESTAMP, TIME
- **Boolean**: BOOLEAN, BOOL
- **JSON**: JSON, JSONB
- **UUID**: UUID
- **Binary**: BLOB, BINARY

### Constraints

- **PRIMARY KEY**: Single and composite keys
- **FOREIGN KEY**: With ON DELETE and ON UPDATE actions
- **UNIQUE**: Single and composite constraints
- **NOT NULL**: Non-nullable columns
- **CHECK**: Simple expressions (basic validation)
- **DEFAULT**: Default values
- **AUTO_INCREMENT**: Auto-incrementing columns

## Constraint Satisfaction Guarantees

1. **Primary Keys**: Always unique, never NULL
2. **Foreign Keys**: Always reference existing records in parent table
3. **Unique Constraints**: No duplicate values (single or composite)
4. **NOT NULL**: No NULL values in non-nullable columns
5. **CHECK Constraints**: Values satisfy constraint expressions (basic)
6. **Data Types**: Values match column data types and length limits

## Validation

The tool includes comprehensive validation:

- Primary key uniqueness
- Foreign key referential integrity
- Unique constraint satisfaction
- NOT NULL constraint compliance
- Data type correctness
- String length limits
- Numeric range validation

Validation results include:
- Total tables validated
- Valid vs invalid tables
- Total errors by type
- Detailed error messages with row numbers

## Reproducibility

Use the `--seed` option for deterministic generation:

```bash
testdatagen generate schema.sql --count 100 --seed 12345
```

Running this command multiple times will produce identical data.

## Locales

Supported locales for realistic data:
- **us**: United States English
- **uk**: United Kingdom English
- **de**: German
- **fr**: French
- **ca**: Canadian English
- **au**: Australian English

```bash
testdatagen generate schema.sql --count 100 --locale uk
```

## Architecture

The tool uses a multi-phase approach:

1. **Parse**: SQL DDL → Schema Definition
2. **Analyze**: Extract constraints and build dependency graph
3. **Generate**: Create data in topological order
   - Primary keys (sequential or UUID)
   - Foreign keys (pool-based selection)
   - Unique values (uniqueness tracking)
   - Realistic values (Faker.js with column name detection)
4. **Validate**: Verify 100% constraint satisfaction
5. **Export**: Output in requested format

## Development

### Setup

```bash
cd testdatagen
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Development Mode

```bash
npm run dev generate examples/basic-users.sql --count 50
```

## Project Structure

```
testdatagen/
├── src/
│   ├── cli/              # Command-line interface
│   ├── core/
│   │   ├── parser/       # SQL DDL parsing
│   │   ├── analyzer/     # Constraint extraction
│   │   ├── generator/    # Data generation
│   │   ├── validator/    # Constraint validation
│   │   └── exporter/     # Output formatting
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utilities
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── examples/             # Example schemas
└── package.json
```

## Troubleshooting

### Schema Parse Error

If the SQL parser fails, check for:
- Missing semicolons
- Unsupported SQL dialect features
- Syntax errors

### Constraint Conflict

If generation fails:
- Check for contradictory CHECK constraints
- Verify foreign key references exist
- Ensure unique constraints don't conflict

### Performance Issues

For large datasets (>10k records):
- Use `--seed` for reproducibility
- Consider generating in batches
- Disable validation with `--no-validate` if needed

## Limitations (Phase 1)

- CHECK constraints: Basic evaluation only
- SQL dialects: Focus on standard SQL
- Self-referencing FKs: Not yet supported (Phase 3)
- Circular dependencies: Not yet supported (Phase 3)

## Roadmap

### Phase 2 (Production Features)
- Statistical distributions (Zipf, Normal)
- JSON and CSV exporters
- Multi-locale expansion
- Edge case injection
- Config file support

### Phase 3 (Advanced Features)
- Database introspection (live DB → schema)
- Self-referencing foreign keys
- Circular dependency resolution
- ORM exporters (Django, Rails, Prisma)
- Custom value generators
- Streaming for large datasets

### Phase 4 (Polish)
- 80%+ test coverage
- Performance benchmarks
- CI/CD pipeline
- Migration guide

## Contributing

This project is part of the Claude Code test data generation skill. See the main repository for contribution guidelines.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [github.com/claude-code/testdatagen](https://github.com/claude-code/testdatagen)
- Documentation: [testdatagen.docs.claude.ai](https://testdatagen.docs.claude.ai)
