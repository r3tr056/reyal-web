import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: () => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(),
        })),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  }),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    supabase: {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            order: jest.fn(),
          })),
          insert: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
    }
  }),
}))

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
  },
})

// Setup fetch mock
global.fetch = jest.fn()

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = {}
  }
  
  append(key, value) {
    this.data[key] = value
  }
  
  get(key) {
    return this.data[key]
  }
}

// Mock File
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks
    this.name = filename
    this.size = options.size || 1024
    this.type = options.type || 'application/octet-stream'
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }
}

// Mock process.env
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'