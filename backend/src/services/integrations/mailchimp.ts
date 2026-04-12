// Mailchimp API v3 integration
// User provides API key + list ID
// On lead capture: POST to Mailchimp, add contact with tags from outcome

export async function addMailchimpContact(
  apiKey: string,
  listId: string,
  email: string,
  firstName: string,
  tags: string[],
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract datacenter from API key (last part after -)
    const dc = apiKey.split('-').pop();
    if (!dc) {
      return { success: false, error: 'Invalid Mailchimp API key format' };
    }

    const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        merge_fields: { FNAME: firstName || '' },
        tags: tags.map(t => ({ name: t, status: 'active' })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Handle "already exists" gracefully
      if ((err as any).title === 'Member Exists') {
        return { success: true }; // Not an error
      }
      return { success: false, error: (err as any).detail || 'Mailchimp API error' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Mailchimp integration error' };
  }
}
