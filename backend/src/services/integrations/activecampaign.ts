// ActiveCampaign API v3 integration
// User provides API key + account URL
// On lead capture: create contact, add tags

export async function addActivecampaignContact(
  apiKey: string,
  accountUrl: string,
  email: string,
  firstName: string,
  tags: string[],
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize the account URL
    let baseUrl = accountUrl.trim();
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Create or update contact
    const contactRes = await fetch(`${baseUrl}/api/3/contacts`, {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: {
          email,
          firstName: firstName || '',
          fieldValues: [
            {
              field: '1',
              value: firstName || '',
            },
          ],
        },
      }),
    });

    if (!contactRes.ok) {
      const err = await contactRes.json().catch(() => ({}));
      // Check if contact already exists
      if (contactRes.status === 409) {
        // Contact exists, try to get it
        const getRes = await fetch(`${baseUrl}/api/3/contacts?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Api-Token': apiKey,
          },
        });

        if (!getRes.ok) {
          return { success: false, error: 'Failed to retrieve existing contact' };
        }

        const getData = await getRes.json() as any;
        if (!getData.contacts || getData.contacts.length === 0) {
          return { success: false, error: 'Contact not found' };
        }
      } else {
        return { success: false, error: (err as any).errors?.join(', ') || 'ActiveCampaign contact creation failed' };
      }
    }

    const contactData = await contactRes.json() as any;
    const contactId = contactData.contact?.id;

    if (!contactId) {
      return { success: false, error: 'Failed to get contact ID from ActiveCampaign' };
    }

    // Add tags to contact
    if (tags.length > 0) {
      for (const tag of tags) {
        try {
          // First, try to get or create the tag
          const tagRes = await fetch(`${baseUrl}/api/3/tags?search=${encodeURIComponent(tag)}`, {
            method: 'GET',
            headers: {
              'Api-Token': apiKey,
            },
          });

          let tagId: string | null = null;

          if (tagRes.ok) {
            const tagData = await tagRes.json() as any;
            if (tagData.tags && tagData.tags.length > 0) {
              tagId = tagData.tags[0].id;
            }
          }

          if (!tagId) {
            // Create the tag
            const createTagRes = await fetch(`${baseUrl}/api/3/tags`, {
              method: 'POST',
              headers: {
                'Api-Token': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tag: { tag, tagType: 'contact' } }),
            });

            if (createTagRes.ok) {
              const newTagData = await createTagRes.json() as any;
              tagId = newTagData.tag?.id;
            }
          }

          // Add tag to contact
          if (tagId) {
            await fetch(`${baseUrl}/api/3/contactTags`, {
              method: 'POST',
              headers: {
                'Api-Token': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactTag: {
                  contact: contactId,
                  tag: tagId,
                },
              }),
            });
          }
        } catch (tagErr: any) {
          console.log(`Failed to add tag "${tag}":`, tagErr.message);
          // Continue with other tags
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'ActiveCampaign integration error' };
  }
}
