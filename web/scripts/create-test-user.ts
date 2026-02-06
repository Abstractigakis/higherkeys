
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createTestUser() {
  const email = 'ericstratigakis+testuser@gmail.com'
  const password = 'p445w0rD$12'

  console.log(`Creating test user: ${email}`)

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    console.error('Error creating user:', error.message)
    return
  }

  console.log('User created successfully and email confirmed!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)
}

createTestUser()
