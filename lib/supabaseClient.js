import dotenv from 'dotenv'
dotenv.config()

import { createClient } from '@supabase/supabase-js'

// Validar variables de entorno
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL o SUPABASE_ANON_KEY')
  process.exit(1)
}

console.log('✅ Variables de entorno validadas correctamente.')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export { supabase }
