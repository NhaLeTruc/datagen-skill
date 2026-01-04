# Example: Blog Platform (Intermediate)

**Complexity**: Intermediate (Multi-table with realistic content patterns)

**Demonstrates**:
- Multi-table schema (users, posts, comments, tags)
- Realistic blog content generation (titles, body text)
- Temporal patterns (publication dates, comment timestamps)
- User activity distributions (authors, commenters)
- Many-to-many relationships via join tables

**User Story**: US2 - Generate Production-Like Data Patterns

---

## Input Schema

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id INT PRIMARY KEY,
    author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    published_at TIMESTAMP NOT NULL,
    view_count INT DEFAULT 0 CHECK (view_count >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id INT PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE tags (
    id INT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);
```

---

## Generation Parameters

- **Seed**: 42 (for reproducibility)
- **Record Counts**:
  - users: 6
  - posts: 10
  - comments: 15
  - tags: 8
  - post_tags: 18 (many-to-many mappings)
- **Locale**: US English (en_US)
- **Distributions**:
  - Author activity: Zipf (alpha=1.3) - power authors write more
  - Post popularity (views): Zipf (alpha=1.5) - few viral posts
  - Comment activity: Zipf (alpha=1.4) - popular posts get more comments
- **Temporal Patterns**:
  - Posts: 70% weekdays, 30% weekends
  - Comments: Within 30 days after post publication

---

## Generated Data

### Step 1: Generate users (authors and commenters)

```sql
-- Seed: 42
-- Locale: US English
-- Realistic patterns: Names from US distributions, realistic bios

INSERT INTO users (id, name, email, bio, created_at) VALUES
  (1, 'Sarah Martinez', 'sarah.martinez@gmail.com', 'Software engineer passionate about web development and open source.', '2023-01-15 10:23:45'),
  (2, 'James Wilson', 'james.wilson@yahoo.com', 'Tech blogger covering cloud computing and DevOps practices.', '2023-02-10 14:30:12'),
  (3, 'Maria Garcia', 'mgarcia@outlook.com', 'Full-stack developer interested in React, Node.js, and database design.', '2023-03-05 09:15:33'),
  (4, 'David Nguyen', 'david_nguyen@hotmail.com', 'Data scientist exploring machine learning and AI applications.', '2023-03-20 16:42:19'),
  (5, 'Jennifer Taylor', 'jennifer.taylor@icloud.com', 'Cybersecurity professional sharing security best practices.', '2023-04-12 11:05:27'),
  (6, 'Michael Brown', 'mbrown@gmail.com', 'Mobile developer building iOS and Android applications.', '2023-05-01 13:18:45');
```

**FK Pool**: `users.id = [1, 2, 3, 4, 5, 6]`

---

### Step 2: Generate posts (with realistic titles and content)

```sql
-- Seed: 42
-- Distribution: Author activity follows Zipf (power authors)
-- Temporal: 70% weekday, 30% weekend
-- Realistic patterns: Blog titles, technical content

INSERT INTO posts (id, author_id, title, body, published_at, view_count) VALUES
  -- Author 2 (James) - Power author (4 posts)
  (1, 2, 'How to Optimize Cloud Computing Costs', 'Cloud computing can be expensive if not managed properly. Here are 5 strategies to reduce your cloud bills while maintaining performance...', '2023-06-12 09:00:00', 1250),
  (2, 2, '10 Ways to Master DevOps Practices', 'DevOps has transformed software development. In this guide, we explore the top practices that every team should adopt...', '2023-06-20 10:30:00', 890),
  (3, 2, 'The Ultimate Guide to CI/CD Pipelines', 'Continuous Integration and Continuous Deployment are essential for modern development. Learn how to build robust pipelines...', '2023-07-05 14:15:00', 2100),
  (4, 2, 'Why Cloud Security Matters in 2023', 'As cloud adoption grows, security becomes paramount. This article covers essential security practices for cloud environments...', '2023-07-18 11:45:00', 675),

  -- Author 1 (Sarah) - Active author (3 posts)
  (5, 1, '7 Ways to Build Scalable Web Applications', 'Scalability is critical for growing applications. Here are proven strategies to ensure your web app can handle millions of users...', '2023-06-25 13:20:00', 1520),
  (6, 1, 'Understanding React Hooks', 'React Hooks revolutionized functional components. This tutorial explains useState, useEffect, and custom hooks with examples...', '2023-07-10 09:45:00', 980),
  (7, 1, 'Best Practices for API Development', 'Building robust APIs requires careful design. Learn about RESTful patterns, authentication, rate limiting, and more...', '2023-07-22 15:30:00', 740),

  -- Author 3 (Maria) - Moderate author (2 posts)
  (8, 3, 'Database Design Fundamentals', 'Good database design is the foundation of any application. Explore normalization, indexing, and query optimization techniques...', '2023-06-28 10:15:00', 520),
  (9, 3, 'Node.js Performance Optimization', 'Node.js powers many high-traffic applications. Discover how to optimize event loop, memory usage, and async operations...', '2023-07-15 12:00:00', 430),

  -- Author 4 (David) - Casual author (1 post)
  (10, 4, 'Machine Learning for Beginners', 'Getting started with machine learning can be overwhelming. This beginner-friendly guide covers the essentials of supervised learning...', '2023-07-08 16:30:00', 1890);
```

**Zipf Distribution Notes**:
- Author 2 (James): 4 posts (40%) - Power author
- Author 1 (Sarah): 3 posts (30%)
- Author 3 (Maria): 2 posts (20%)
- Author 4 (David): 1 post (10%)
- Authors 5, 6: 0 posts (casual users)

**View Count Distribution** (Zipf for popularity):
- Post 3: 2100 views (viral post)
- Post 10: 1890 views
- Post 5: 1520 views
- Post 1: 1250 views
- Posts 2, 6, 8, 9: 430-980 views (moderate)
- Post 4: 675 views (lower popularity)

**FK Pool**: `posts.id = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`

---

### Step 3: Generate tags (technical topics)

```sql
-- Common technical tags
INSERT INTO tags (id, name) VALUES
  (1, 'cloud-computing'),
  (2, 'devops'),
  (3, 'web-development'),
  (4, 'react'),
  (5, 'nodejs'),
  (6, 'api-design'),
  (7, 'database'),
  (8, 'machine-learning');
```

**FK Pool**: `tags.id = [1, 2, 3, 4, 5, 6, 7, 8]`

---

### Step 4: Generate post_tags (many-to-many)

```sql
-- Posts have 1-3 tags each
INSERT INTO post_tags (post_id, tag_id) VALUES
  -- Post 1: Cloud computing costs
  (1, 1), (1, 2),

  -- Post 2: DevOps practices
  (2, 2),

  -- Post 3: CI/CD pipelines
  (3, 2),

  -- Post 4: Cloud security
  (4, 1), (4, 2),

  -- Post 5: Scalable web apps
  (5, 3),

  -- Post 6: React hooks
  (6, 3), (6, 4),

  -- Post 7: API development
  (7, 3), (7, 6),

  -- Post 8: Database design
  (8, 7),

  -- Post 9: Node.js performance
  (9, 3), (9, 5),

  -- Post 10: Machine learning
  (10, 8);
```

**Tag Usage Frequency** (realistic distribution):
- devops (tag 2): 4 posts (most popular)
- web-development (tag 3): 4 posts
- cloud-computing (tag 1): 2 posts
- react (tag 4): 1 post
- nodejs (tag 5): 1 post
- api-design (tag 6): 1 post
- database (tag 7): 1 post
- machine-learning (tag 8): 1 post

---

### Step 5: Generate comments (with temporal patterns)

```sql
-- Seed: 42
-- Distribution: Popular posts (higher views) get more comments
-- Temporal: Comments within 30 days of post publication

INSERT INTO comments (id, post_id, user_id, body, created_at) VALUES
  -- Post 3 (2100 views) - Most popular: 4 comments
  (1, 3, 5, 'Great article! This helped me set up our CI/CD pipeline.', '2023-07-06 10:15:00'),
  (2, 3, 4, 'Very comprehensive guide. Do you have examples for GitHub Actions?', '2023-07-07 14:30:00'),
  (3, 3, 6, 'Thanks for sharing! Bookmarked for reference.', '2023-07-12 09:45:00'),
  (4, 3, 1, 'Excellent breakdown of deployment strategies.', '2023-07-20 16:20:00'),

  -- Post 10 (1890 views) - Second popular: 3 comments
  (5, 10, 2, 'Perfect intro for ML newcomers. Well explained!', '2023-07-09 11:00:00'),
  (6, 10, 3, 'Could you cover neural networks next?', '2023-07-14 13:25:00'),
  (7, 10, 5, 'Loved the practical examples. Very helpful.', '2023-07-22 15:10:00'),

  -- Post 5 (1520 views) - Third popular: 3 comments
  (8, 5, 4, 'Scalability is crucial. Good tips here.', '2023-06-27 10:30:00'),
  (9, 5, 6, 'How do you handle database scaling?', '2023-06-30 14:15:00'),
  (10, 5, 2, 'Microservices approach works well for this.', '2023-07-08 09:20:00'),

  -- Post 1 (1250 views) - Moderate: 2 comments
  (11, 1, 3, 'Cloud costs can spiral quickly. These tips are valuable.', '2023-06-13 11:45:00'),
  (12, 1, 5, 'Reserved instances saved us 40% on AWS bills.', '2023-06-18 16:30:00'),

  -- Post 6 (980 views) - Moderate: 2 comments
  (13, 6, 2, 'Hooks made React so much cleaner. Nice tutorial!', '2023-07-11 10:00:00'),
  (14, 6, 4, 'useEffect timing can be tricky. Good explanation.', '2023-07-16 13:40:00'),

  -- Post 2 (890 views) - Lower: 1 comment
  (15, 2, 1, 'DevOps culture is as important as the tools.', '2023-06-22 15:20:00');

  -- Posts 4, 7, 8, 9: No comments yet (lower popularity or newer)
```

**Comment Distribution** (correlated with view count):
- Post 3 (2100 views): 4 comments
- Post 10 (1890 views): 3 comments
- Post 5 (1520 views): 3 comments
- Post 1 (1250 views): 2 comments
- Post 6 (980 views): 2 comments
- Post 2 (890 views): 1 comment
- Posts 4, 7, 8, 9: 0 comments

---

## Validation Report

### Generation Metadata

- **Seed**: 42
- **Timestamp**: 2024-01-04 16:00:00 UTC
- **Record Counts**: users: 6, posts: 10, comments: 15, tags: 8, post_tags: 18
- **Schema**: blog-platform (5 tables)
- **Locale**: US English (en_US)

### Constraint Satisfaction Checks

#### Primary Keys

- ✅ **users.id**: All unique [1..6], non-null
- ✅ **posts.id**: All unique [1..10], non-null
- ✅ **comments.id**: All unique [1..15], non-null
- ✅ **tags.id**: All unique [1..8], non-null
- ✅ **post_tags (post_id, tag_id)**: All 18 combinations unique

#### Foreign Keys

- ✅ **posts.author_id → users.id**: 10/10 (100%)
- ✅ **comments.post_id → posts.id**: 15/15 (100%)
- ✅ **comments.user_id → users.id**: 15/15 (100%)
- ✅ **post_tags.post_id → posts.id**: 18/18 (100%)
- ✅ **post_tags.tag_id → tags.id**: 18/18 (100%)

#### Check Constraints

- ✅ **posts.view_count >= 0**: All 10 satisfy (430-2100 views)

### Distribution Analysis

#### Author Activity (Zipf α=1.3)

**Posts per Author**:

- Author 2 (James Wilson): 4 posts (40%) - **Power author**
- Author 1 (Sarah Martinez): 3 posts (30%)
- Author 3 (Maria Garcia): 2 posts (20%)
- Author 4 (David Nguyen): 1 post (10%)
- Authors 5, 6: 0 posts (readers/commenters only)

**Zipf Validation**: ✅ Top 33% of authors (2/6) produce 70% of content

#### Post Popularity (View Counts, Zipf α=1.5)

**View Distribution**:

- Post 3: 2100 views (21% of total) - **Viral post**
- Post 10: 1890 views (19%)
- Post 5: 1520 views (15%)
- Posts 1, 2, 6: 890-1250 views (30%)
- Posts 4, 7, 8, 9: 430-740 views (15%)

**Zipf Validation**: ✅ Top 30% of posts get 55% of views

#### Comment Activity (Correlated with Post Popularity)

**Comments per Post**:

- High-view posts (1500+ views): 3-4 comments
- Medium-view posts (800-1300 views): 2 comments
- Low-view posts (< 800 views): 0-1 comments

**Correlation**: ✅ Comment count correlates with view count (realistic engagement pattern)

#### Temporal Patterns

**Post Publication Dates**:

- Weekdays: 7 posts (70%)
- Weekends: 3 posts (30%)

**Comment Timing**:

- Within 7 days of post: 9 comments (60%)
- Within 30 days of post: 15 comments (100%)
- Average delay: 8 days after publication

**Temporal Validation**: ✅ Realistic posting and commenting patterns

#### Content Patterns (US English Locale)

**Name Quality**: ✅ All names from US distributions

- Martinez, Wilson, Garcia, Nguyen, Taylor, Brown (top US last names)

**Email Quality**: ✅ Realistic domains and formats

- gmail, yahoo, outlook, hotmail, icloud domains
- Varied formats: first.last, flast, first_last, flastname

**Title Quality**: ✅ Realistic blog post titles

- "How to" pattern: 1 post
- "N Ways to" pattern: 2 posts
- "Ultimate Guide" pattern: 1 post
- "Why X Matters" pattern: 1 post
- Other descriptive patterns: 5 posts

**Tag Quality**: ✅ Technical, lowercase, hyphenated format

- cloud-computing, devops, web-development (industry standard naming)

### Warnings

None. All constraints satisfied with realistic patterns.

---

## Patterns Demonstrated

### User Story 2: Production-Like Data Patterns

| Pattern | Example in This Dataset |
|---------|-------------------------|
| **Realistic Names** | US distributions: Martinez, Wilson, Garcia, Nguyen |
| **Realistic Emails** | Varied domains (gmail, yahoo, outlook) + formats |
| **Realistic Content** | Blog titles follow common patterns ("How to", "N Ways") |
| **Zipf: Author Activity** | Author 2 writes 40% of posts (power author pattern) |
| **Zipf: Post Popularity** | Top 30% of posts get 55% of views |
| **Zipf: Comment Distribution** | Popular posts get 3-4 comments, unpopular get 0-1 |
| **Temporal Patterns** | 70% posts on weekdays, comments within 30 days of publication |
| **Content Correlation** | View count correlates with comment count (engagement) |
| **Many-to-Many Relationships** | Posts have 1-3 tags, realistic tag distribution |

---

## How This Example Was Generated

1. **Users**: Generated with US name distributions and realistic tech-focused bios
2. **Posts**: Used Zipf distribution for author activity (power authors write more)
3. **Titles**: Generated using common blog title patterns ("How to", "N Ways", "Ultimate Guide")
4. **View Counts**: Applied Zipf distribution for popularity (few viral posts, many moderate)
5. **Comments**: Generated proportional to view count (popular posts get more engagement)
6. **Tags**: Created technical tags with realistic naming (lowercase, hyphenated)
7. **Temporal**: 70% weekday posts, comments within 30 days of publication

---

## Next Steps

### Progressive Examples

1. **Basic**: [Users Table](../basic/users-table.md) - Single table ✓
2. **Intermediate**: [E-Commerce Schema](ecommerce-schema.md) - Multi-table FK ✓
3. **Intermediate** (This example): Blog Platform - Realistic content + many-to-many ✓
4. **Advanced**: [Self-Referencing Hierarchies](../advanced/self-referencing-hierarchies.md) - Tiered generation

---

**Related**:

- **Workflows**: [Data Generation](../../workflows/03-data-generation.md)
- **Patterns**: [Distribution Strategies](../../patterns/distribution-strategies.md), [Locale Patterns](../../patterns/locale-patterns.md)
- **Templates**: [Validation Report](../../templates/validation-report.md)

---

**Last Updated**: 2026-01-04
