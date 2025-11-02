import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  agent_code: string | null
  banned_until: string | null
  last_sign_in_at: string | null
  created_at: string
  roles: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (req.method === 'GET') {
      // List all users with their profiles and roles
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      if (authError) {
        console.error('Error fetching auth users:', authError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get profiles and roles for each user
      const usersWithProfiles: UserProfile[] = await Promise.all(
        (authUsers.users || []).map(async (authUser) => {
          // Get profile
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('display_name, agent_code')
            .eq('user_id', authUser.id)
            .single()

          // Get roles
          const { data: userRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', authUser.id)
            .eq('is_active', true)

          return {
            id: authUser.id,
            email: authUser.email || '',
            display_name: profile?.display_name || null,
            agent_code: profile?.agent_code || null,
            banned_until: authUser.banned_until,
            last_sign_in_at: authUser.last_sign_in_at,
            created_at: authUser.created_at,
            roles: (userRoles || []).map(r => r.role),
          }
        })
      )

      return new Response(
        JSON.stringify({ users: usersWithProfiles }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (req.method === 'POST') {
      const { userId, ban } = await req.json()

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (ban) {
        // Ban user - set banned_until to far future (permanently banned)
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          banned_until: new Date('2099-12-31').toISOString(),
        })

        if (error) {
          console.error('Error banning user:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to ban user', details: error }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User banned successfully' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        // Unban user - set banned_until to null
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          banned_until: null,
        })

        if (error) {
          console.error('Error unbanning user:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to unban user', details: error }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User unbanned successfully' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in user management function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})