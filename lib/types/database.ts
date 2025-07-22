export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
          is_verified: boolean
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
          is_verified?: boolean
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
          is_verified?: boolean
          created_at?: string
          updated_at?: string
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
          analysis: Json | null
          is_analyzed: boolean
          thumbnail_url: string | null
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
          analysis?: Json | null
          is_analyzed?: boolean
          thumbnail_url?: string | null
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
          analysis?: Json | null
          is_analyzed?: boolean
          thumbnail_url?: string | null
          created_at?: string
        }
      }
      // ... other tables with proper typing
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
      print_quality: 'draft' | 'standard' | 'high' | 'ultra'
      urgency: 'standard' | 'express' | 'rush'
    }
  }
}
