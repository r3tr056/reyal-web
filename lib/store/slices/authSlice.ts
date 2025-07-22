import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface Profile {
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

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  initializing: boolean
  error: string | null
  isAuthenticated: boolean
  sessionChecked: boolean
}

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: false,
  initializing: true,
  error: null,
  isAuthenticated: false,
  sessionChecked: false,
}

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { session }, error } = await supabase().auth.getSession()
      
      if (error) {
        console.error('Session initialization error:', error)
        return rejectWithValue(error.message)
      }

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase()
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError)
        }

        return {
          user: session.user,
          profile: profile || null,
        }
      }

      return {
        user: null,
        profile: null,
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error)
      return rejectWithValue(error.message || 'Failed to initialize authentication')
    }
  }
)

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        return rejectWithValue(getAuthErrorMessage(error))
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase()
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError)
        }

        return {
          user: data.user,
          profile: profile || null,
        }
      }

      return rejectWithValue('Authentication failed')
    } catch (error: any) {
      console.error('Sign in error:', error)
      return rejectWithValue('An unexpected error occurred. Please try again.')
    }
  }
)

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({
    email,
    password,
    fullName,
    phone,
    redirectTo,
  }: {
    email: string
    password: string
    fullName?: string
    phone?: string
    redirectTo?: string
  }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName?.trim() || null,
            phone: phone?.trim() || null,
          },
        },
      })

      if (error) {
        return rejectWithValue(getAuthErrorMessage(error))
      }

      return {
        user: data.user,
        session: data.session,
        needsConfirmation: !data.session, // If no session, email confirmation is needed
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return rejectWithValue('An unexpected error occurred. Please try again.')
    }
  }
)

function getAuthErrorMessage(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please check your credentials.'
    case 'Email not confirmed':
      return 'Please verify your email address before signing in.'
    case 'User already registered':
      return 'An account with this email already exists. Please sign in instead.'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long.'
    case 'Unable to validate email address: invalid format':
      return 'Invalid email address. Please check and try again.'
    case 'For security purposes, you can only request this once every 60 seconds':
      return 'Too many requests. Please wait a minute before trying again.'
    default:
      return error.message
  }
}

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase().auth.signOut()
      if (error) {
        console.error('Error signing out:', error.message)
        return rejectWithValue(error.message)
      }
      return true
    } catch (error: any) {
      console.error('Sign out error:', error)
      return rejectWithValue('Failed to sign out')
    }
  }
)



export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: Partial<Profile>, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as { auth: AuthState }
      if (!auth.user) {
        return rejectWithValue('User not authenticated')
      }

      const { data, error } = await supabase()
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auth.user.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        return rejectWithValue(error.message)
      }

      return data
    } catch (error: any) {
      console.error('Profile update error:', error)
      return rejectWithValue('Failed to update profile')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<{ user: User | null; profile?: Profile | null }>) => {
      state.user = action.payload.user
      state.isAuthenticated = !!action.payload.user
      if (action.payload.profile != undefined) {
        state.profile = action.payload.profile
      }
    },
    setProfile: (state, action: PayloadAction<Profile | null>) => {
      state.profile = action.payload
    },
    setSessionChecked: (state, action: PayloadAction<boolean>) => {
      state.sessionChecked = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true
        state.initializing = true
        state.error = null
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.loading = false
        state.initializing = false
        state.user = action.payload.user
        state.profile = action.payload.profile
        state.isAuthenticated = !!action.payload.user
        state.sessionChecked = true
        state.error = null
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false
        state.initializing = false
        state.user = null
        state.profile = null
        state.isAuthenticated = false
        state.sessionChecked = true
        state.error = action.payload as string
      })

    // Sign In
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.profile = action.payload.profile
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.profile = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Sign Up
    builder
      .addCase(signUp.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.needsConfirmation) {
          state.user = null
          state.profile = null
          state.isAuthenticated = false
        } else {
          state.user = action.payload.user
          state.isAuthenticated = !!action.payload.user
        }
        state.error = null
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false
        state.user = null
        state.profile = null
        state.isAuthenticated = false
        state.error = action.payload as string
      })

    // Sign Out
    builder
      .addCase(signOut.pending, (state) => {
        state.loading = true
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.profile = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false
        state.profile = action.payload
        state.error = null
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, setUser, setProfile, setSessionChecked } = authSlice.actions
export default authSlice.reducer
