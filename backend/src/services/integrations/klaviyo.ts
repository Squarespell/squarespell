// Klaviyo API integration
// User provides API key
// On lead capture: create/update profile, add to list, apply tags

export async function addKlaviyoContact(
  apiKey: string,
  listId: string,
  email: string,
  firstName: string,
  tags: string[],
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create or update profile
    const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email,
            first_name: firstName || undefined,
            properties: { ...metadata, tags },
          },
        },
      }),
    });

    if (!profileRes.ok) {
      const err = await profileRes.json().catch(() => ({}));
      return { success: false, error: (err as any).detail || 'Klaviyo profile creation failed' };
    }

    const profileData = await profileRes.json() as any;
    const profileId = profileData.data?.id;

    if (!profileId) {
      return { success: false, error: 'Failed to get profile ID from Klaviyo' };
    }

    // Add profile to list
    const addToListRes = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: [
          {
            type: 'profile',
            id: profileId,
          },
        ],
      }),
    });

    if (!addToListRes.ok) {
      const err = await addToListRes.json().catch(() => ({}));
      // Some errors are non-critical (e.g., already on list)
      console.log('Klaviyo add to list response:', err);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Klaviyo integration error' };
  }
}
