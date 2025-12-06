import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WV811 Ticket Expire Edge Function
 *
 * Runs daily (midnight) to:
 * 1. Mark expired tickets (past expiration date)
 * 2. Archive old completed tickets (>90 days old)
 * 3. Clean up old processed email ingests (>30 days)
 * 4. Generate compliance summary
 */

interface ExpirationResults {
  expiredTickets: number;
  archivedTickets: number;
  cleanedEmailIngests: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: ExpirationResults = {
      expiredTickets: 0,
      archivedTickets: 0,
      cleanedEmailIngests: 0,
      errors: [],
    };

    // 1. Mark expired tickets using the database function
    console.log('Running auto_expire_tickets...');
    const { data: expiredCount, error: expireError } = await supabaseAdmin.rpc('auto_expire_tickets');

    if (expireError) {
      console.error('Error expiring tickets:', expireError);
      results.errors.push(`Expire error: ${expireError.message}`);
    } else {
      results.expiredTickets = expiredCount || 0;
      console.log(`Expired ${results.expiredTickets} tickets`);
    }

    // Log notes for newly expired tickets
    if (results.expiredTickets > 0) {
      const { data: newlyExpired } = await supabaseAdmin
        .from('wv811_tickets')
        .select('id')
        .eq('status', 'EXPIRED')
        .gte('status_changed_at', new Date(Date.now() - 60000).toISOString()); // Changed in last minute

      if (newlyExpired) {
        for (const ticket of newlyExpired) {
          await supabaseAdmin.from('wv811_ticket_notes').insert({
            ticket_id: ticket.id,
            user_id: null,
            note_type: 'SYSTEM',
            content: 'Ticket automatically marked as expired (past expiration date).',
          });
        }
      }
    }

    // 2. Archive old completed tickets (mark as archived, could move to archive table in future)
    // For now, we just update a flag or add a note
    console.log('Checking for tickets to archive...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: ticketsToArchive, error: archiveQueryError } = await supabaseAdmin
      .from('wv811_tickets')
      .select('id, ticket_number')
      .in('status', ['CLEAR', 'EXPIRED', 'CANCELLED'])
      .lt('status_changed_at', ninetyDaysAgo.toISOString());

    if (archiveQueryError) {
      console.error('Error querying tickets to archive:', archiveQueryError);
      results.errors.push(`Archive query error: ${archiveQueryError.message}`);
    } else if (ticketsToArchive && ticketsToArchive.length > 0) {
      // For now, just log how many would be archived
      // In a full implementation, we might move to an archive table
      results.archivedTickets = ticketsToArchive.length;
      console.log(`Found ${results.archivedTickets} tickets eligible for archival`);

      // Add archive notes
      for (const ticket of ticketsToArchive) {
        const { data: existingNote } = await supabaseAdmin
          .from('wv811_ticket_notes')
          .select('id')
          .eq('ticket_id', ticket.id)
          .eq('note_type', 'SYSTEM')
          .ilike('content', '%archived%')
          .limit(1);

        if (!existingNote || existingNote.length === 0) {
          await supabaseAdmin.from('wv811_ticket_notes').insert({
            ticket_id: ticket.id,
            user_id: null,
            note_type: 'SYSTEM',
            content: 'Ticket marked for archival (over 90 days since completion).',
          });
        }
      }
    }

    // 3. Clean up old email ingests
    console.log('Cleaning up old email ingests...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: emailsToClean, error: cleanQueryError } = await supabaseAdmin
      .from('wv811_email_ingests')
      .select('id')
      .in('status', ['COMPLETED', 'DUPLICATE'])
      .lt('processed_at', thirtyDaysAgo.toISOString());

    if (cleanQueryError) {
      console.error('Error querying emails to clean:', cleanQueryError);
      results.errors.push(`Clean query error: ${cleanQueryError.message}`);
    } else if (emailsToClean && emailsToClean.length > 0) {
      // Clear the raw email content to save storage (keep metadata for audit)
      const { error: updateError } = await supabaseAdmin
        .from('wv811_email_ingests')
        .update({
          raw_body_text: null,
          raw_body_html: null,
          raw_headers: null,
        })
        .in(
          'id',
          emailsToClean.map((e) => e.id)
        );

      if (updateError) {
        console.error('Error cleaning email content:', updateError);
        results.errors.push(`Clean update error: ${updateError.message}`);
      } else {
        results.cleanedEmailIngests = emailsToClean.length;
        console.log(`Cleaned content from ${results.cleanedEmailIngests} email ingests`);
      }
    }

    // 4. Generate compliance summary (could be expanded)
    console.log('Generating compliance summary...');
    const today = new Date().toISOString().split('T')[0];

    const { data: summary } = await supabaseAdmin.from('wv811_tickets').select('status', { count: 'exact' });

    const complianceSummary = {
      date: today,
      totalActive: summary?.filter((t) => !['EXPIRED', 'CANCELLED', 'CLEAR'].includes(t.status)).length || 0,
      totalExpired: summary?.filter((t) => t.status === 'EXPIRED').length || 0,
      totalClear: summary?.filter((t) => t.status === 'CLEAR').length || 0,
      totalConflict: summary?.filter((t) => t.status === 'CONFLICT').length || 0,
      processingResults: results,
    };

    console.log('Daily processing complete:', complianceSummary);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily ticket processing completed',
        results,
        summary: complianceSummary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ticket expire error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
