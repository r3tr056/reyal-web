export interface Database {
  public: {
    Tables: {
      uploaded_files: {
        Row: {
          id: string
          user_id: string
          filename: string
          original_filename: string
          file_size: number
          file_type: string
          storage_path: string
          status: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
          analysis_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          original_filename: string
          file_size: number
          file_type: string
          storage_path: string
          status?: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
          analysis_data?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          original_filename?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          status?: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
          analysis_data?: any
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          file_id: string
          user_id: string
          settings: any
          cost_breakdown: any
          estimated_days: number
          total_cost: number
          status: 'pending' | 'accepted' | 'rejected' | 'expired'
          valid_until: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_id: string
          user_id: string
          settings: any
          cost_breakdown: any
          estimated_days: number
          total_cost: number
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          valid_until: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          user_id?: string
          settings?: any
          cost_breakdown?: any
          estimated_days?: number
          total_cost?: number
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          valid_until?: string
          created_at?: string
          updated_at?: string
        }
      }
      print_jobs: {
        Row: {
          id: string
          quote_id: string
          user_id: string
          status: 'pending' | 'in_progress' | 'printing' | 'completed' | 'cancelled' | 'failed'
          started_at: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          user_id: string
          status?: 'pending' | 'in_progress' | 'printing' | 'completed' | 'cancelled' | 'failed'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          user_id?: string
          status?: 'pending' | 'in_progress' | 'printing' | 'completed' | 'cancelled' | 'failed'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      business_settings: {
        Row: {
          key: string
          value: any
          updated_by: string
          updated_at: string
        }
        Insert: {
          key: string
          value: any
          updated_by: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: any
          updated_by?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
