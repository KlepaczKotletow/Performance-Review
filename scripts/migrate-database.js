require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables.');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL migration file
const migrationPath = path.join(__dirname, '../src/database/migrations/001_create_schema.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Executing database migration...');
console.log(`📁 Migration file: ${migrationPath}\n`);

// Execute SQL using Supabase REST API
async function runMigration() {
  try {
    // Split SQL into individual statements (rough split by semicolons)
    // Note: This is a simple approach. For complex SQL, you might need a proper SQL parser
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === '') continue;
      
      try {
        // Use Supabase RPC to execute raw SQL
        // Note: Supabase doesn't directly support raw SQL execution via REST API
        // So we'll use the REST API with proper error handling
        
        // For table creation, we can use the REST API but need to handle it differently
        // Let's try using the PostgREST endpoint or use direct SQL execution
        
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
        
        // Since Supabase client doesn't have direct SQL execution,
        // we'll output instructions for manual execution or use MCP
        if (i === 0) {
          console.log('\n⚠️  Note: The Supabase JavaScript client cannot execute raw SQL directly.');
          console.log('   You have two options:\n');
          console.log('   Option 1: Use Supabase MCP execute_sql tool (recommended)');
          console.log('   Option 2: Copy the SQL and run it in Supabase SQL Editor\n');
          console.log('📋 SQL to execute:');
          console.log('─'.repeat(80));
          console.log(sql);
          console.log('─'.repeat(80));
          break;
        }
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }
    
    console.log('\n✅ Migration script completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Copy the SQL above');
    console.log('   2. Go to Supabase Dashboard → SQL Editor');
    console.log('   3. Paste the SQL and click "Run"');
    console.log('   4. Verify tables are created in Table Editor\n');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();
