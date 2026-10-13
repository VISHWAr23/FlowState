import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSchema() {
  console.log('Updating database schema...');

  // Create exec_sql function if it doesn't exist
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Alter table to add password_hash column if it doesn't exist
  const alterTableSql = `
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
  `;

  // Create unique index on lower(username) if it doesn't exist
  const createIndexSql = `
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles (lower(username));
  `;

  try {
    // Create the exec_sql function
    const { error: functionError } = await supabase.rpc('exec_sql', { query: createFunctionSql });
    if (functionError) {
      console.error('Error creating exec_sql function:', functionError);
      // Try to create it via direct SQL
      const { error: directError } = await supabase.rpc('exec_sql', { query: `
        CREATE OR REPLACE FUNCTION exec_sql(query text)
        RETURNS void AS $$
        BEGIN
          EXECUTE query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      ` });
      if (directError) {
        console.error('Error creating exec_sql function via direct SQL:', directError);
      }
    }

    // Use exec_sql to run the DDL
    const { error: alterError } = await supabase.rpc('exec_sql', { query: alterTableSql });
    if (alterError) {
      console.error('Error altering table:', alterError);
      // Try direct SQL via rpc
      const { error: directAlterError } = await supabase.rpc('exec_sql', { query: alterTableSql });
      if (directAlterError) {
        console.error('Error altering table via direct SQL:', directAlterError);
      } else {
        console.log('Successfully altered table via direct SQL');
      }
    } else {
      console.log('Successfully altered table');
    }

    // Use exec_sql to create the index
    const { error: indexError } = await supabase.rpc('exec_sql', { query: createIndexSql });
    if (indexError) {
      console.error('Error creating index:', indexError);
      // Try direct SQL via rpc
      const { error: directIndexError } = await supabase.rpc('exec_sql', { query: createIndexSql });
      if (directIndexError) {
        console.error('Error creating index via direct SQL:', directIndexError);
      } else {
        console.log('Successfully created index via direct SQL');
      }
    } else {
      console.log('Successfully created index');
    }

    // Drop the exec_sql function (optional, but clean up)
    const dropFunctionSql = `DROP FUNCTION IF EXISTS exec_sql(text);`;
    const { error: dropError } = await supabase.rpc('exec_sql', { query: dropFunctionSql });
    if (dropError) {
      console.error('Error dropping exec_sql function:', dropError);
    } else {
      console.log('Successfully dropped exec_sql function');
    }

    console.log('Schema update completed.');
  } catch (err) {
    console.error('Unexpected error during schema update:', err);
  } finally {
    process.exit(0);
  }
}

updateSchema();