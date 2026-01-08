# PostgreSQL Best Practices Reference

A comprehensive guide for PostgreSQL database design, optimization, and management for the Shop & Chop application.

---

## Table of Contents

1. [Database Design](#1-database-design)
2. [Schema Management](#2-schema-management)
3. [Indexing Strategies](#3-indexing-strategies)
4. [Query Optimization](#4-query-optimization)
5. [Data Types](#5-data-types)
6. [Constraints & Validation](#6-constraints--validation)
7. [Transactions](#7-transactions)
8. [Performance Tuning](#8-performance-tuning)
9. [Security](#9-security)
10. [Backup & Recovery](#10-backup--recovery)
11. [Monitoring](#11-monitoring)
12. [Anti-Patterns](#12-anti-patterns)

---

## 1. Database Design

### Normalized Schema Design

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    dietary_preferences JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INTEGER CHECK (prep_time >= 0), -- minutes
    cook_time INTEGER CHECK (cook_time >= 0), -- minutes
    servings INTEGER DEFAULT 4 CHECK (servings > 0),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    cuisine_type VARCHAR(50),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients table (normalized)
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- dairy, produce, meat, etc.
    unit_type VARCHAR(50), -- weight, volume, count
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ingredients junction table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
    unit VARCHAR(50) NOT NULL,
    notes TEXT,
    UNIQUE(recipe_id, ingredient_id)
);

-- Recipe instructions
CREATE TABLE recipe_instructions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number > 0),
    instruction TEXT NOT NULL,
    time_estimate INTEGER, -- minutes for this step
    UNIQUE(recipe_id, step_number)
);

-- Meal plans
CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Meal plan entries
CREATE TABLE meal_plan_entries (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    meal_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    servings INTEGER DEFAULT 1 CHECK (servings > 0),
    UNIQUE(meal_plan_id, meal_date, meal_type)
);
```
### Relationship Patterns

```sql
-- One-to-Many: User has many recipes
ALTER TABLE recipes ADD CONSTRAINT fk_recipes_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Many-to-Many: Recipes have many ingredients
-- Handled through recipe_ingredients junction table

-- Self-referencing: Recipe variations
ALTER TABLE recipes ADD COLUMN parent_recipe_id INTEGER 
    REFERENCES recipes(id) ON DELETE SET NULL;

-- Polymorphic relationships (avoid in PostgreSQL, use specific tables instead)
-- BAD: comments table with commentable_type/commentable_id
-- GOOD: recipe_comments, meal_plan_comments tables
```

### JSONB Usage

```sql
-- Store flexible data as JSONB
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE recipes ADD COLUMN nutrition_info JSONB;
ALTER TABLE recipes ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;

-- JSONB queries
-- Check if user has dietary preference
SELECT * FROM users 
WHERE dietary_preferences @> '["vegetarian"]';

-- Search recipes by tags
SELECT * FROM recipes 
WHERE tags @> '["quick", "healthy"]';

-- Update JSONB fields
UPDATE recipes 
SET nutrition_info = nutrition_info || '{"calories": 350}'::jsonb
WHERE id = 1;

-- Extract JSONB values
SELECT name, nutrition_info->>'calories' as calories
FROM recipes 
WHERE nutrition_info->>'calories' IS NOT NULL;
```

---

## 2. Schema Management

### Migration Scripts

```sql
-- migrations/001_create_initial_schema.sql
BEGIN;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    dietary_preferences JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

```sql
-- migrations/002_add_full_text_search.sql
BEGIN;

-- Add full-text search columns
ALTER TABLE recipes ADD COLUMN search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.cuisine_type, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_recipe_search_vector_trigger
    BEFORE INSERT OR UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_recipe_search_vector();

-- Update existing records
UPDATE recipes SET updated_at = NOW();

-- Create GIN index for full-text search
CREATE INDEX idx_recipes_search_vector ON recipes USING gin(search_vector);

COMMIT;
```

### Schema Versioning

```sql
-- Create schema version table
CREATE TABLE schema_versions (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track migrations
INSERT INTO schema_versions (version, description) VALUES
(1, 'Initial schema creation'),
(2, 'Add full-text search'),
(3, 'Add recipe ratings');
```

---

## 3. Indexing Strategies

### Primary Indexes

```sql
-- B-tree indexes (default)
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_meal_plan_entries_date ON meal_plan_entries(meal_date);

-- Composite indexes
CREATE INDEX idx_recipes_user_cuisine ON recipes(user_id, cuisine_type);
CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, start_date, end_date);

-- Partial indexes (for specific conditions)
CREATE INDEX idx_active_meal_plans ON meal_plans(user_id, start_date) 
    WHERE end_date >= CURRENT_DATE;

-- Unique indexes
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));
```

### Specialized Indexes

```sql
-- GIN indexes for JSONB
CREATE INDEX idx_users_dietary_preferences ON users USING gin(dietary_preferences);
CREATE INDEX idx_recipes_tags ON recipes USING gin(tags);

-- GiST indexes for full-text search
CREATE INDEX idx_recipes_search ON recipes USING gin(search_vector);

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING gin(name gin_trgm_ops);

-- Expression indexes
CREATE INDEX idx_users_full_name ON users((first_name || ' ' || last_name));
CREATE INDEX idx_recipes_total_time ON recipes((prep_time + cook_time));
```

### Index Maintenance

```sql
-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey';

-- Reindex when needed
REINDEX INDEX CONCURRENTLY idx_recipes_search_vector;
```

---

## 4. Query Optimization

### Efficient Queries

```sql
-- Use LIMIT for pagination
SELECT id, name, created_at
FROM recipes
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET $2;

-- Better: Use cursor-based pagination
SELECT id, name, created_at
FROM recipes
WHERE user_id = $1 
AND created_at < $2  -- cursor from previous page
ORDER BY created_at DESC
LIMIT 20;

-- Use EXISTS instead of IN for large datasets
SELECT r.id, r.name
FROM recipes r
WHERE EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id
    AND ri.ingredient_id = ANY($1::int[])
);

-- Efficient counting with estimates for large tables
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'recipes';
```

### Complex Queries

```sql
-- Recipe search with ingredients and ratings
WITH recipe_matches AS (
    SELECT 
        r.id,
        r.name,
        r.description,
        r.prep_time + r.cook_time as total_time,
        ts_rank(r.search_vector, plainto_tsquery('english', $1)) as rank
    FROM recipes r
    WHERE r.search_vector @@ plainto_tsquery('english', $1)
),
recipe_ingredients AS (
    SELECT 
        ri.recipe_id,
        array_agg(i.name) as ingredient_names
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    GROUP BY ri.recipe_id
)
SELECT 
    rm.*,
    ri.ingredient_names,
    COALESCE(AVG(rt.rating), 0) as avg_rating,
    COUNT(rt.id) as rating_count
FROM recipe_matches rm
LEFT JOIN recipe_ingredients ri ON rm.id = ri.recipe_id
LEFT JOIN recipe_ratings rt ON rm.id = rt.recipe_id
GROUP BY rm.id, rm.name, rm.description, rm.total_time, rm.rank, ri.ingredient_names
ORDER BY rm.rank DESC, avg_rating DESC
LIMIT 20;
```

### Query Analysis

```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT r.name, COUNT(ri.id) as ingredient_count
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE r.user_id = 1
GROUP BY r.id, r.name
ORDER BY ingredient_count DESC;

-- Check query plans
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM recipes 
WHERE search_vector @@ plainto_tsquery('chicken pasta');
```

---

## 5. Data Types

### Choosing Appropriate Types

```sql
-- Numeric types
CREATE TABLE recipe_nutrition (
    recipe_id INTEGER REFERENCES recipes(id),
    calories DECIMAL(6,1),        -- 9999.9 calories max
    protein DECIMAL(5,2),         -- 999.99g max
    carbs DECIMAL(5,2),
    fat DECIMAL(5,2),
    fiber DECIMAL(4,2),
    sodium INTEGER,               -- mg, whole numbers
    price MONEY                   -- Built-in money type
);

-- Text types
CREATE TABLE recipe_reviews (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id),
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),           -- Limited title
    review TEXT,                  -- Unlimited review text
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5)
);

-- Date/Time types
CREATE TABLE meal_schedule (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER REFERENCES meal_plans(id),
    scheduled_for TIMESTAMP WITH TIME ZONE,  -- Specific time
    meal_date DATE,                          -- Just the date
    prep_duration INTERVAL,                  -- Time intervals
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boolean with constraints
ALTER TABLE recipes ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN is_vegetarian BOOLEAN DEFAULT false;

-- Arrays
ALTER TABLE recipes ADD COLUMN dietary_tags TEXT[];
-- Query: WHERE 'gluten-free' = ANY(dietary_tags)

-- UUID for external references
ALTER TABLE recipes ADD COLUMN external_id UUID DEFAULT uuid_generate_v4();
```

### JSONB Best Practices

```sql
-- Structure JSONB data consistently
UPDATE recipes SET nutrition_info = jsonb_build_object(
    'calories', 350,
    'macros', jsonb_build_object(
        'protein', 25.5,
        'carbs', 45.2,
        'fat', 12.8
    ),
    'vitamins', jsonb_build_array('A', 'C', 'D'),
    'allergens', jsonb_build_array('dairy', 'nuts')
);

-- Validate JSONB structure
ALTER TABLE recipes ADD CONSTRAINT valid_nutrition_info
CHECK (
    nutrition_info IS NULL OR (
        jsonb_typeof(nutrition_info->'calories') = 'number' AND
        (nutrition_info->'calories')::numeric > 0
    )
);
```

---

## 6. Constraints & Validation

### Data Integrity

```sql
-- Check constraints
ALTER TABLE recipes ADD CONSTRAINT valid_servings 
    CHECK (servings > 0 AND servings <= 50);

ALTER TABLE recipe_ingredients ADD CONSTRAINT positive_amount
    CHECK (amount > 0);

ALTER TABLE users ADD CONSTRAINT valid_email
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Exclusion constraints
CREATE TABLE recipe_bookings (
    id SERIAL PRIMARY KEY,
    kitchen_id INTEGER,
    recipe_id INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    EXCLUDE USING gist (
        kitchen_id WITH =,
        tsrange(start_time, end_time) WITH &&
    )
);

-- Custom validation functions
CREATE OR REPLACE FUNCTION validate_meal_plan_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'End date must be after start date';
    END IF;
    
    IF NEW.start_date < CURRENT_DATE - INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Meal plan cannot be more than 1 year in the past';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_meal_plan_dates_trigger
    BEFORE INSERT OR UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION validate_meal_plan_dates();
```

### Referential Integrity

```sql
-- Cascade deletes appropriately
ALTER TABLE recipe_ingredients 
    ADD CONSTRAINT fk_recipe_ingredients_recipe
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;

-- Restrict deletes when referenced
ALTER TABLE meal_plan_entries
    ADD CONSTRAINT fk_meal_plan_entries_recipe
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE RESTRICT;

-- Set null on delete
ALTER TABLE recipes
    ADD CONSTRAINT fk_recipes_parent
    FOREIGN KEY (parent_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;
```
---

## 7. Transactions

### Transaction Management

```sql
-- Basic transaction
BEGIN;
    INSERT INTO recipes (name, user_id) VALUES ('New Recipe', 1);
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
    VALUES (currval('recipes_id_seq'), 1, 2.0, 'cups');
COMMIT;

-- Transaction with savepoints
BEGIN;
    INSERT INTO meal_plans (user_id, name, start_date, end_date)
    VALUES (1, 'Weekly Plan', '2024-01-01', '2024-01-07');
    
    SAVEPOINT before_entries;
    
    INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, meal_date, meal_type)
    VALUES (currval('meal_plans_id_seq'), 1, '2024-01-01', 'dinner');
    
    -- If this fails, rollback to savepoint
    ROLLBACK TO before_entries;
    
    -- Continue with other operations
    INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, meal_date, meal_type)
    VALUES (currval('meal_plans_id_seq'), 2, '2024-01-01', 'dinner');
COMMIT;
```

### Isolation Levels

```sql
-- Read committed (default)
BEGIN ISOLATION LEVEL READ COMMITTED;
    -- Can see committed changes from other transactions
COMMIT;

-- Repeatable read
BEGIN ISOLATION LEVEL REPEATABLE READ;
    -- Consistent snapshot throughout transaction
    SELECT COUNT(*) FROM recipes; -- Always returns same count
COMMIT;

-- Serializable (strictest)
BEGIN ISOLATION LEVEL SERIALIZABLE;
    -- Prevents phantom reads and serialization anomalies
COMMIT;
```

### Handling Concurrency

```sql
-- Optimistic locking with version column
ALTER TABLE recipes ADD COLUMN version INTEGER DEFAULT 1;

-- Update with version check
UPDATE recipes 
SET name = $1, version = version + 1
WHERE id = $2 AND version = $3;

-- Pessimistic locking
BEGIN;
    SELECT * FROM recipes WHERE id = 1 FOR UPDATE;
    -- Other transactions will wait
    UPDATE recipes SET name = 'Updated' WHERE id = 1;
COMMIT;

-- Advisory locks for application-level coordination
SELECT pg_advisory_lock(12345); -- Acquire lock
-- Do work
SELECT pg_advisory_unlock(12345); -- Release lock
```

---

## 8. Performance Tuning

### Configuration Tuning

```sql
-- Key PostgreSQL settings (postgresql.conf)
-- Memory settings
shared_buffers = '256MB'              -- 25% of RAM for dedicated server
work_mem = '4MB'                      -- Per-operation memory
maintenance_work_mem = '64MB'         -- For maintenance operations
effective_cache_size = '1GB'          -- OS cache estimate

-- Connection settings
max_connections = 100                 -- Adjust based on needs
shared_preload_libraries = 'pg_stat_statements'

-- Logging for performance analysis
log_min_duration_statement = 1000     -- Log slow queries (1 second)
log_statement = 'mod'                 -- Log modifications
log_checkpoints = on
log_connections = on
log_disconnections = on
```

### Query Performance

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze table statistics
ANALYZE recipes;

-- Update table statistics automatically
ALTER TABLE recipes SET (autovacuum_analyze_scale_factor = 0.1);

-- Vacuum and analyze regularly
VACUUM ANALYZE recipes;
```

### Connection Pooling

```javascript
// Application-level pooling with node-postgres
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'shop_and_chop',
    user: 'postgres',
    password: 'password',
    port: 5432,
    max: 20,                    // Maximum connections
    min: 5,                     // Minimum connections
    idleTimeoutMillis: 30000,   // Close idle connections
    connectionTimeoutMillis: 2000,
    acquireTimeoutMillis: 60000,
});

// Use connection pooling
async function getRecipes(userId) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM recipes WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    } finally {
        client.release(); // Return to pool
    }
}
```

---

## 9. Security

### Access Control

```sql
-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant specific permissions
GRANT CONNECT ON DATABASE shop_and_chop TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own recipes
CREATE POLICY user_recipes_policy ON recipes
    FOR ALL TO app_user
    USING (user_id = current_setting('app.current_user_id')::integer);

-- Set user context in application
-- SET app.current_user_id = 123;
```

### Data Protection

```sql
-- Encrypt sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash passwords (done in application, but can be done in DB)
INSERT INTO users (email, password_hash)
VALUES ('user@example.com', crypt('password', gen_salt('bf', 12)));

-- Verify password
SELECT * FROM users 
WHERE email = 'user@example.com' 
AND password_hash = crypt('password', password_hash);

-- Encrypt sensitive columns
ALTER TABLE users ADD COLUMN encrypted_notes TEXT;
UPDATE users SET encrypted_notes = pgp_sym_encrypt('sensitive data', 'encryption_key');

-- Decrypt data
SELECT pgp_sym_decrypt(encrypted_notes::bytea, 'encryption_key') FROM users;
```

### SQL Injection Prevention

```sql
-- Always use parameterized queries
-- BAD (vulnerable to SQL injection)
-- query = `SELECT * FROM recipes WHERE name = '${userInput}'`;

-- GOOD (parameterized)
-- query = 'SELECT * FROM recipes WHERE name = $1';
-- params = [userInput];

-- Use SECURITY DEFINER functions for complex operations
CREATE OR REPLACE FUNCTION get_user_recipes(p_user_id INTEGER)
RETURNS TABLE(id INTEGER, name VARCHAR, description TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    -- Validate input
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        RAISE EXCEPTION 'Invalid user ID';
    END IF;
    
    RETURN QUERY
    SELECT r.id, r.name, r.description
    FROM recipes r
    WHERE r.user_id = p_user_id;
END;
$$;
```

---

## 10. Backup & Recovery

### Backup Strategies

```bash
# Full database backup
pg_dump -h localhost -U postgres -d shop_and_chop > backup.sql

# Compressed backup
pg_dump -h localhost -U postgres -d shop_and_chop | gzip > backup.sql.gz

# Custom format (faster restore, parallel)
pg_dump -h localhost -U postgres -Fc -d shop_and_chop > backup.dump

# Schema only
pg_dump -h localhost -U postgres -s -d shop_and_chop > schema.sql

# Data only
pg_dump -h localhost -U postgres -a -d shop_and_chop > data.sql

# Specific tables
pg_dump -h localhost -U postgres -t recipes -t users -d shop_and_chop > tables.sql
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'

# Base backup
pg_basebackup -h localhost -U postgres -D /backup/base -Ft -z -P

# Restore to specific point in time
# 1. Restore base backup
# 2. Create recovery.conf
restore_command = 'cp /path/to/archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
```

### Automated Backups

```bash
#!/bin/bash
# backup_script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="shop_and_chop"

# Create backup
pg_dump -h localhost -U postgres -Fc $DB_NAME > $BACKUP_DIR/backup_$DATE.dump

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.dump s3://my-backups/
```

---

## 11. Monitoring

### Performance Monitoring

```sql
-- Monitor active queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state = 'active';

-- Database size monitoring
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Table size monitoring
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Health Checks

```sql
-- Connection monitoring
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Lock monitoring
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 12. Anti-Patterns

### Common Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| SELECT * | Unnecessary data transfer | Select specific columns |
| Missing indexes | Slow queries | Add appropriate indexes |
| N+1 queries | Multiple round trips | Use JOINs or batch queries |
| Large transactions | Lock contention | Keep transactions small |
| No connection pooling | Resource exhaustion | Implement connection pooling |
| Storing files in DB | Performance issues | Store file paths, not files |
| Generic JSONB | No structure validation | Use specific columns when possible |

### Code Examples

```sql
-- BAD: SELECT *
SELECT * FROM recipes WHERE user_id = 1;

-- GOOD: Specific columns
SELECT id, name, prep_time, cook_time FROM recipes WHERE user_id = 1;

-- BAD: N+1 query pattern
-- First query: Get recipes
SELECT id, name FROM recipes WHERE user_id = 1;
-- Then for each recipe: Get ingredients (N queries)
SELECT * FROM recipe_ingredients WHERE recipe_id = ?;

-- GOOD: Single query with JOIN
SELECT 
    r.id,
    r.name,
    array_agg(
        json_build_object(
            'name', i.name,
            'amount', ri.amount,
            'unit', ri.unit
        )
    ) as ingredients
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
WHERE r.user_id = 1
GROUP BY r.id, r.name;

-- BAD: No prepared statements
-- Dynamic query building in application

-- GOOD: Prepared statements
PREPARE get_user_recipes(int) AS
    SELECT id, name FROM recipes WHERE user_id = $1;
EXECUTE get_user_recipes(1);

-- BAD: Large JSONB without structure
ALTER TABLE recipes ADD COLUMN data JSONB;

-- GOOD: Structured approach
ALTER TABLE recipes ADD COLUMN nutrition JSONB;
ALTER TABLE recipes ADD CONSTRAINT valid_nutrition 
    CHECK (
        nutrition IS NULL OR (
            jsonb_typeof(nutrition->'calories') = 'number' AND
            jsonb_typeof(nutrition->'protein') = 'number'
        )
    );
```

---

## Quick Reference

### Common Data Types

```sql
-- Numeric
SERIAL, BIGSERIAL          -- Auto-incrementing integers
INTEGER, BIGINT            -- Whole numbers
DECIMAL(p,s), NUMERIC(p,s) -- Exact decimals
REAL, DOUBLE PRECISION     -- Floating point
MONEY                      -- Currency

-- Text
CHAR(n)                    -- Fixed length
VARCHAR(n)                 -- Variable length with limit
TEXT                       -- Unlimited length

-- Date/Time
DATE                       -- Date only
TIME                       -- Time only
TIMESTAMP                  -- Date and time
TIMESTAMP WITH TIME ZONE   -- With timezone
INTERVAL                   -- Time intervals

-- Other
BOOLEAN                    -- True/false
UUID                       -- Universally unique identifier
JSONB                      -- Binary JSON
ARRAY                      -- Arrays of any type
```

### Useful Functions

```sql
-- Date/Time
NOW(), CURRENT_DATE, CURRENT_TIME
DATE_TRUNC('day', timestamp)
EXTRACT(YEAR FROM date)
AGE(timestamp, timestamp)

-- String
CONCAT(str1, str2), str1 || str2
UPPER(text), LOWER(text)
LENGTH(text), TRIM(text)
SUBSTRING(text, start, length)

-- JSON
json_build_object(key, value, ...)
json_agg(expression)
jsonb_set(target, path, new_value)

-- Aggregates
COUNT(*), SUM(column), AVG(column)
MIN(column), MAX(column)
ARRAY_AGG(column)
STRING_AGG(column, delimiter)
```

---

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL Backup and Recovery](https://www.postgresql.org/docs/current/backup.html)

---

This reference provides a comprehensive foundation for PostgreSQL development, covering everything from schema design to performance optimization and security best practices.