import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  'https://gablgsruyuhvjurhtcxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0Njc5NSwiZXhwIjoyMDgwNTIyNzk1fQ.3gmXsKaWtBuQTSR2Rt_2A-oVqrjvIjQ3-LQFr7ONniA'
);

async function runMigrations() {
  console.log('Testing Supabase connection...');

  // Test basic query
  const { data: tickets, error: testError } = await supabase
    .from('wv811_tickets')
    .select('id')
    .limit(1);

  if (testError) {
    console.log('Connection test error:', testError.message);
  } else {
    console.log('✓ Connection successful, found', tickets?.length, 'tickets');
  }

  // Check if updated_by column exists
  const { data: sampleTicket, error: sampleError } = await supabase
    .from('wv811_tickets')
    .select('*')
    .limit(1)
    .single();

  if (sampleTicket) {
    const hasUpdatedBy = 'updated_by' in sampleTicket;
    console.log('✓ updated_by column exists:', hasUpdatedBy);
  }

  // Check email_logs table
  const { error: emailLogsError } = await supabase
    .from('email_logs')
    .select('id')
    .limit(1);

  if (emailLogsError?.message?.includes('does not exist')) {
    console.log('✗ email_logs table does not exist - migration 047 needed');
  } else {
    console.log('✓ email_logs table exists');
  }

  // Check bid_projects table (from 048)
  const { error: bidProjectsError } = await supabase
    .from('bid_intelligence_projects')
    .select('id')
    .limit(1);

  if (bidProjectsError?.message?.includes('does not exist')) {
    console.log('✗ bid_intelligence_projects table does not exist - migration 048 needed');
  } else {
    console.log('✓ bid_intelligence_projects table exists');
  }

  console.log('\n--- Migration Status Summary ---');
  console.log('Note: Migrations 046-048 need to be run manually in Supabase SQL Editor');
  console.log('Go to: https://supabase.com/dashboard/project/gablgsruyuhvjurhtcxx/sql/new');
}

runMigrations().catch(console.error);
