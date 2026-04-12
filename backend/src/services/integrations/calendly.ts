// Calendly integration
// Prefill Calendly scheduling URLs with lead info
// Check for existing bookings via Calendly API

export function prefillCalendlyLink(
  calendlyUrl: string,
  name: string,
  email: string
): string {
  try {
    // Parse the URL
    const url = new URL(calendlyUrl);

    // Calendly supports UTM parameters and name/email pre-fill via URL parameters
    // Standard Calendly links can accept: name, email, and custom fields
    if (name) url.searchParams.set('name', name);
    if (email) url.searchParams.set('email', email);

    // Add a UTM source to track traffic from Squarespell
    url.searchParams.set('utm_source', 'squarespell');
    url.searchParams.set('utm_medium', 'quiz');

    return url.toString();
  } catch (err) {
    // If URL parsing fails, return the original URL
    return calendlyUrl;
  }
}

export async function checkCalendlyBooking(
  apiKey: string,
  email: string
): Promise<{ success: boolean; hasBooking: boolean; error?: string }> {
  try {
    if (!apiKey || !email) {
      return { success: false, hasBooking: false, error: 'Missing Calendly API key or email' };
    }

    // Calendly API endpoint to get scheduled events
    // Documentation: https://developer.calendly.com/docs/api/v2/
    // This uses the Calendly v2 API
    const response = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Handle auth errors gracefully
      if (response.status === 401) {
        return { success: false, hasBooking: false, error: 'Invalid Calendly API key' };
      }
      return { success: false, hasBooking: false, error: `Calendly API error: ${response.statusText}` };
    }

    const data = await response.json() as Record<string, any>;
    const events = data.collection || [];

    if (!Array.isArray(events)) {
      return { success: true, hasBooking: false };
    }

    // Check if any event has an invitee with matching email
    const hasBooking = events.some((event: any) => {
      const invitees = event.invitees_counter?.total_invitees > 0;
      const matchingEmail = event.name?.includes(email) ||
        JSON.stringify(event).toLowerCase().includes(email.toLowerCase());
      return invitees && matchingEmail;
    });

    return { success: true, hasBooking };
  } catch (err: any) {
    return { success: false, hasBooking: false, error: err.message || 'Calendly booking check failed' };
  }
}
