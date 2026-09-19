/** Emails the fake Clerk Backend API knows about, keyed by Clerk user id. */
export const clerkDirectory: Record<string, string> = {};
export const clerkBehaviour = { fail: false };
export async function getClerkUser(id: string) {
  if (clerkBehaviour.fail) throw new Error('clerk api unreachable (fixture)');
  return { id, emailAddresses: [{ emailAddress: clerkDirectory[id] ?? '' }] };
}
