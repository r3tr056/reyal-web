import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NjkxNzkwOCwiZXhwIjoxOTYyNDkzOTA4fQ.xxx'

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.error('Missing required Supabase environment variables in production')
}

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

export const supabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'printing-service@1.0.0',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        }
      }
    })
  }
  return supabaseInstance
}

// Export the typed client
export type SupabaseClient = ReturnType<typeof supabase>

// Helper for server-side usage
export const createServerClient = (accessToken?: string) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
        'X-Client-Info': 'printing-service-server@1.0.0',
      } : {
        'X-Client-Info': 'printing-service-server@1.0.0',
      },
    },
  })
}