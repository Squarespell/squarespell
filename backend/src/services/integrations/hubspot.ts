// HubSpot API v3 integration
// User provides private app access token
// On lead capture: Create/update contact in HubSpot with properties from quiz outcome

export async function addHubspotContact(
  accessToken: string,
  email: string,
  firstName: string,
  tags: string[],
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, search for existing contact by email
    const searchUrl = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email,
          }],
        }],
      }),
    });

    const searchData: any = searchRes.ok ? await searchRes.json() : { total: 0 };

    const properties: Record<string, string> = {
      email,
      firstname: firstName || '',
    };

    // Map quiz metadata to HubSpot properties
    if (metadata.quiz_title) {
      properties.squarespell_quiz = metadata.quiz_title;
    }
    if (metadata.outcome) {
      properties.squarespell_outcome = metadata.outcome;
    }
    if (metadata.score !== undefined) {
      properties.squarespell_score = String(metadata.score);
    }
    if (tags.length > 0) {
      properties.squarespell_tags = tags.join('; ');
    }

    if (searchData.total > 0) {
      // Update existing contact
      const contactId = searchData.results[0].id;
      const updateUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (!updateRes.ok) {
        const err: any = await updateRes.json().catch(() => ({}));
        return { success: false, error: err.message || 'HubSpot update failed' };
      }
    } else {
      // Create new contact
      const createUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (!createRes.ok) {
        const err: any = await createRes.json().catch(() => ({}));
        // 409 = contact already exists (race condition)
        if (createRes.status === 409) {
          return { success: true };
        }
        return { success: false, error: err.message || 'HubSpot create failed' };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'HubSpot integration error' };
  }
}
