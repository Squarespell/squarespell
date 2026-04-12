import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Hash an API key using SHA256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Test authentication by validating the API key
 * Zapier calls this to verify the user's credentials
 */
export async function testAuth(apiKey: string): Promise<{ success: boolean; message: string; user_id?: string }> {
  try {
    const keyHash = hashApiKey(apiKey);

    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .select('user_id, revoked_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyRecord) {
      return { success: false, message: 'Invalid API key' };
    }

    // Check if key is revoked
    if (keyRecord.revoked_at) {
      return { success: false, message: 'API key has been revoked' };
    }

    return {
      success: true,
      message: 'API key is valid',
      user_id: keyRecord.user_id
    };
  } catch (err: any) {
    console.error('Authentication error:', err);
    return { success: false, message: 'Authentication failed' };
  }
}

/**
 * Get user_id from an API key (used by middleware)
 */
export async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  try {
    const keyHash = hashApiKey(apiKey);

    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .select('user_id, revoked_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyRecord || keyRecord.revoked_at) {
      return null;
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return keyRecord.user_id;
  } catch (err: any) {
    console.error('Failed to get user from API key:', err);
    return null;
  }
}

/**
 * Zapier's authentication definition
 */
export const authentication = {
  type: 'custom',
  test: {
    url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/zapier/auth/test`,
    method: 'POST',
    body: 'x-api-key={{bundle.authData.api_key}}',
  },
  fields: [
    {
      key: 'api_key',
      type: 'string',
      required: true,
      helpText: 'Your Squarespell API key. Generate one in your account settings.',
    },
  ],
  connectionLabel: '{{bundle.authData.api_key}}',
};
