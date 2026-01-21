/**
 * Script to create a new user in the Agents Portal
 * Usage: node create-user.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (same as used in previous commands)
const SUPABASE_URL = 'https://gqhcjqxcvhgwsqfqgekh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGNqcXhjdmhnd3NxZnFnZWtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM2MDI2MSwiZXhwIjoyMDY3OTM2MjYxfQ.ZLORCcwM4Ou0g5hQi9FgI5yFDyBdaO5dEcTPsy7zdxM';

// User details
const userEmail = 'benjamin.w@unlimitedinsurance.io';
const userPassword = 'BenUnlimited@321';
const displayName = 'Benjamin Wunder';

async function createUser() {
  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Creating user...');
    console.log(`Email: ${userEmail}`);
    console.log(`Display Name: ${displayName}`);

    // Create the user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true, // Auto-confirm email so user can login immediately
      user_metadata: {
        display_name: displayName
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    console.log('\n✅ User created successfully!');
    console.log(`User ID: ${authData.user.id}`);
    console.log(`Email: ${authData.user.email}`);

    // The profile should be created automatically by the trigger (handle_new_user)
    // But let's verify and create it if needed
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking profile:', profileError);
    } else if (!profileData) {
      // Profile doesn't exist, create it manually
      console.log('\nCreating profile...');
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          display_name: displayName
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
      } else {
        console.log('✅ Profile created successfully!');
        console.log(`Profile ID: ${newProfile.id}`);
      }
    } else {
      console.log('✅ Profile already exists or was created automatically');
      console.log(`Profile: ${JSON.stringify(profileData, null, 2)}`);
    }

    console.log('\n🎉 User setup complete!');
    console.log(`\nUser can now login with:`);
    console.log(`  Email: ${userEmail}`);
    console.log(`  Password: ${userPassword}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('already registered')) {
      console.error('\nThis email is already registered. User may already exist.');
    }
    process.exit(1);
  }
}

// Run the script
createUser();
