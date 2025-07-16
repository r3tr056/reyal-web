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
      marketplace_products: {
        Row: {
          id: string
          user_id: string
          file_id: string | null
          title: string
          description: string | null
          short_description: string | null
          category: string
          tags: string[] | null
          price: number
          original_price: number | null
          currency: string
          material_codes: string[] | null
          print_time_hours: number | null
          complexity: number
          file_size_mb: number | null
          dimensions: any | null
          preview_images: string[] | null
          model_file_url: string | null
          download_count: number
          view_count: number
          rating_average: number
          rating_count: number
          is_featured: boolean
          is_active: boolean
          is_approved: boolean
          license_type: string
          supports_required: boolean
          raft_required: boolean
          infill_percentage: number
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_id?: string | null
          title: string
          description?: string | null
          short_description?: string | null
          category: string
          tags?: string[] | null
          price?: number
          original_price?: number | null
          currency?: string
          material_codes?: string[] | null
          print_time_hours?: number | null
          complexity?: number
          file_size_mb?: number | null
          dimensions?: any | null
          preview_images?: string[] | null
          model_file_url?: string | null
          download_count?: number
          view_count?: number
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          is_active?: boolean
          is_approved?: boolean
          license_type?: string
          supports_required?: boolean
          raft_required?: boolean
          infill_percentage?: number
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_id?: string | null
          title?: string
          description?: string | null
          short_description?: string | null
          category?: string
          tags?: string[] | null
          price?: number
          original_price?: number | null
          currency?: string
          material_codes?: string[] | null
          print_time_hours?: number | null
          complexity?: number
          file_size_mb?: number | null
          dimensions?: any | null
          preview_images?: string[] | null
          model_file_url?: string | null
          download_count?: number
          view_count?: number
          rating_average?: number
          rating_count?: number
          is_featured?: boolean
          is_active?: boolean
          is_approved?: boolean
          license_type?: string
          supports_required?: boolean
          raft_required?: boolean
          infill_percentage?: number
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      product_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          review_text: string | null
          images: string[] | null
          is_verified_purchase: boolean
          helpful_count: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          review_text?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean
          helpful_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          review_text?: string | null
          images?: string[] | null
          is_verified_purchase?: boolean
          helpful_count?: number
          created_at?: string
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
          properties: any | null
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
          properties?: any | null
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
          properties?: any | null
          created_at?: string
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
