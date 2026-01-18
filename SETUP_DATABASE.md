# Database Setup - Supabase Migration

## Migration File
`src/database/migrations/001_create_schema.sql`

## Tables Created

The migration will create the following tables:

1. **`workspaces`** - Stores Slack workspace installations (OAuth tokens)
2. **`users`** - Stores Slack user information mapped to workspaces
3. **`templates`** - Review question templates
4. **`review_cycles`** - Performance review cycles
5. **`participants`** - Review participants (who needs to provide feedback)
6. **`feedback`** - Feedback responses from participants
7. **`continuous_feedback`** - Ad-hoc feedback (outside of review cycles)

## Execution Options

### Option 1: Using Supabase MCP `execute_sql` (Recommended)

You can execute the SQL using the Supabase MCP `execute_sql` function:

1. Open the migration file: `src/database/migrations/001_create_schema.sql`
2. Use MCP `execute_sql` function with the SQL content
3. Verify tables are created using `list_tables`

### Option 2: Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `src/database/migrations/001_create_schema.sql`
3. Paste and click "Run"
4. Verify in Table Editor

## After Migration

Once executed, you should see these tables:
- workspaces
- users
- templates
- review_cycles
- participants
- feedback
- continuous_feedback

Plus indexes and triggers for automatic `updated_at` timestamps.
