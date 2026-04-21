// ConvertKit (Kit) API v4 integration
// User provides API key + form ID or tag ID
// On lead capture: POST subscriber to ConvertKit, apply tags from outcome

export async function addConvertkitSubscriber(
  apiKey: string,
  formId: string,
  email: string,
  firstName: string,
  tags: string[],
  metadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Subscribe via form endpoint (most common ConvertKit flow)
    var url = 'https://api.convertkit.com/v3/forms/' + formId + '/subscribe';

    var body: Record<string, any> = {
      api_key: apiKey,
      email: email,
    };

    if (firstName) {
      body.first_name = firstName;
    }

    // Add custom fields from metadata
    if (metadata && Object.keys(metadata).length > 0) {
      body.fields = {};
      if (metadata.outcome) body.fields.outcome = metadata.outcome;
      if (metadata.quiz_title) body.fields.quiz_title = metadata.quiz_title;
      if (metadata.score !== undefined) body.fields.score = String(metadata.score);
    }

    // Add tags
    if (tags && tags.length > 0) {
      body.tags = tags;
    }

    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      var err = await response.json().catch(function() { return {}; });
      return { success: false, error: (err as any).message || (err as any).error || 'ConvertKit API error' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'ConvertKit integration error' };
  }
}
