import dotenv from 'dotenv'
dotenv.config()
console.log('Environment variables loaded.')

import { createClient } from '@supabase/supabase-js'

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.')
  process.exit(1) // Exit the process with an error code
} else {
  console.log('Environment variables validated successfully.')
}

try {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
  console.log('Supabase client created successfully.')
  module.exports = { supabase }
} catch (error) {
  console.error('Error creating Supabase client:', error)
  process.exit(1) // Exit the process with an error code
}
