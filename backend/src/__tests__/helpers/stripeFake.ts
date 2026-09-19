export const stripeCalls: { checkout: any[]; subsUpdate: any[] } = { checkout: [], subsUpdate: [] };
export const stripeBehaviour = { failCheckout: false };
export function resetStripe() { stripeCalls.checkout.length = 0; stripeCalls.subsUpdate.length = 0; stripeBehaviour.failCheckout = false; }
