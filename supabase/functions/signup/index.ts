import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, firstName, lastName, organizationName }: SignupRequest = await req.json();

    // Validate input
    if (!email || !password || !firstName || !lastName || !organizationName) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate slug from organization name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if organization slug already exists
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: 'An organization with this name already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName,
        slug: slug,
        legal_name: organizationName,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return new Response(
        JSON.stringify({ error: `Failed to create organization: ${orgError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create the user with organization_id in metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now (can change to false for email verification)
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        organization_id: org.id,
      },
    });

    if (authError) {
      // Rollback: delete the organization
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);

      console.error('User creation error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get the ADMIN role
    const { data: adminRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('code', 'ADMIN')
      .single();

    if (adminRole && authData.user) {
      // Step 4: Assign ADMIN role to the user
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: adminRole.id,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully',
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
        },
        organization: {
          id: org.id,
          name: org.name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
