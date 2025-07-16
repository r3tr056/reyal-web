import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single instance and reuse it
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      // For development/demo purposes, create a mock client
      console.warn('Supabase credentials not found. Using mock client for development.')
      return createMockClient()
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }
  return supabaseInstance
}

// Mock client for development when Supabase is not configured
function createMockClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Mock auth - not configured' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Mock auth - not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithOAuth: () => Promise.resolve({ data: { url: null }, error: { message: 'Mock auth - not configured' } })
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: { message: 'Mock database - not configured' } }),
      update: () => ({ data: null, error: { message: 'Mock database - not configured' } }),
      upsert: () => ({ data: null, error: { message: 'Mock database - not configured' } }),
      delete: () => ({ data: null, error: { message: 'Mock database - not configured' } })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Mock storage - not configured' } }),
        getPublicUrl: () => ({ data: { publicUrl: '/placeholder.svg' } })
      })
    }
  } as any
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          company: string | null
          address: string | null
          city: string | null
          country: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          company?: string | null
          address?: string | null
          city?: string | null
          country?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          company?: string | null
          address?: string | null
          city?: string | null
          country?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      materials: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          price_per_hour: number
          price_per_gram: number | null
          density: number | null
          available: boolean
          properties: any
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          price_per_hour: number
          price_per_gram?: number | null
          density?: number | null
          available?: boolean
          properties?: any
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          price_per_hour?: number
          price_per_gram?: number | null
          density?: number | null
          available?: boolean
          properties?: any
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          original_filename: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          mime_type: string | null
          analysis: any
          is_analyzed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_filename: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          mime_type?: string | null
          analysis?: any
          is_analyzed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_filename?: string
          filename?: string
          file_path?: string
          file_size?: number
          file_type?: string
          mime_type?: string | null
          analysis?: any
          is_analyzed?: boolean
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          user_id: string
          file_id: string
          quote_number: string
          settings: any
          cost_breakdown: any
          total_cost: number
          estimated_days: number
          status: string
          valid_until: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id: string
          quote_number: string
          settings: any
          cost_breakdown: any
          total_cost: number
          estimated_days: number
          status?: string
          valid_until: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string
          quote_number?: string
          settings?: any
          cost_breakdown?: any
          total_cost?: number
          estimated_days?: number
          status?: string
          valid_until?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          status: string
          total_amount: number
          payment_status: string
          payment_method: string | null
          payment_id: string | null
          shipping_address: any
          notes: string | null
          estimated_delivery: string | null
          actual_delivery: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          status?: string
          total_amount: number
          payment_status?: string
          payment_method?: string | null
          payment_id?: string | null
          shipping_address?: any
          notes?: string | null
          estimated_delivery?: string | null
          actual_delivery?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          status?: string
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          payment_id?: string | null
          shipping_address?: any
          notes?: string | null
          estimated_delivery?: string | null
          actual_delivery?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          quote_id: string
          file_id: string
          quantity: number
          unit_price: number
          total_price: number
          settings: any
          status: string
          print_started_at: string | null
          print_completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          quote_id: string
          file_id: string
          quantity?: number
          unit_price: number
          total_price: number
          settings: any
          status?: string
          print_started_at?: string | null
          print_completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          quote_id?: string
          file_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          settings?: any
          status?: string
          print_started_at?: string | null
          print_completed_at?: string | null
          created_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          quote_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quote_id: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quote_id?: string
          quantity?: number
          created_at?: string
        }
      }
    }
  }
}
