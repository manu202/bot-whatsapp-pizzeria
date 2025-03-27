import dotenv from 'dotenv'
dotenv.config()
import { createClient } from '@supabase/supabase-js'

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.')
  process.exit(1) // Exit the process with an error code
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export { supabase }
