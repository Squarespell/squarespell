import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabaseClient = {
  from: vi.fn((tableName: string) => ({
    select: vi.fn(function (this: any) {
      return this;
    }),
    insert: vi.fn(function (this: any) {
      return this;
    }),
    update: vi.fn(function (this: any) {
      return this;
    }),
    delete: vi.fn(function (this: any) {
      return this;
    }),
    eq: vi.fn(function (this: any) {
      return this;
    }),
    gte: vi.fn(function (this: any) {
      return this;
    }),
    lte: vi.fn(function (this: any) {
      return this;
    }),
    gt: vi.fn(function (this: any) {
      return this;
    }),
    lt: vi.fn(function (this: any) {
      return this;
    }),
    order: vi.fn(function (this: any) {
      return this;
    }),
    limit: vi.fn(function (this: any) {
      return this;
    }),
    single: vi.fn(async function (this: any) {
      return { data: null, error: null };
    }),
    upsert: vi.fn(async function (this: any) {
      return { data: null, error: null };
    }),
  })),
  rpc: vi.fn(async () => ({ data: null, error: null })),
};

// Mock environment variables
export function setupTestEnv() {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.NODE_ENV = 'test';
}

// Reset mocks between tests
export function resetMocks() {
  vi.clearAllMocks();
}
