// Acuity Scheduling integration
// Prefill Acuity scheduling URLs with lead info
// Check for existing bookings via Acuity API

export function prefillAcuityLink(
  acuityUrl: string,
  name: string,
  email: string
): string {
  try {
    // Parse the URL
    const url = new URL(acuityUrl);

    // Add query parameters for pre-fill
    // Acuity uses query params like: firstName, lastName, email
    const nameparts = (name || '').trim().split(/\s+/);
    const firstName = nameparts[0] || '';
    const lastName = nameparts.slice(1).join(' ') || '';

    if (firstName) url.searchParams.set('firstName', firstName);
    if (lastName) url.searchParams.set('lastName', lastName);
    if (email) url.searchParams.set('email', email);

    return url.toString();
  } catch (err) {
    // If URL parsing fails, return the original URL
    return acuityUrl;
  }
}

export async function checkAcuityBooking(
  apiKey: string,
  email: string
): Promise<{ success: boolean; hasBooking: boolean; error?: string }> {
  try {
    if (!apiKey || !email) {
      return { success: false, hasBooking: false, error: 'Missing Acuity API key or email' };
    }

    // Acuity Scheduling API endpoint to get appointments
    // Documentation: https://acuityscheduling.com/docs/json-api/appointments
    const response = await fetch('https://acuityscheduling.com/api/v1/appointments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Handle auth errors gracefully
      if (response.status === 401) {
        return { success: false, hasBooking: false, error: 'Invalid Acuity API key' };
      }
      return { success: false, hasBooking: false, error: `Acuity API error: ${response.statusText}` };
    }

    const appointments = await response.json();
    if (!Array.isArray(appointments)) {
      return { success: true, hasBooking: false };
    }

    // Check if any appointment matches the email
    const hasBooking = appointments.some(
      (apt: any) => apt.email?.toLowerCase() === email.toLowerCase()
    );

    return { success: true, hasBooking };
  } catch (err: any) {
    return { success: false, hasBooking: false, error: err.message || 'Acuity booking check failed' };
  }
}
