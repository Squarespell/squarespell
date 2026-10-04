export const stripeCalls: { checkout: any[]; subsUpdate: any[]; couponsCreated: any[] } = { checkout: [], subsUpdate: [], couponsCreated: [] };
/** Coupons that exist in the fake Stripe account (id -> coupon). */
export const stripeCoupons = new Map<string, any>();
export const stripeBehaviour = { failCheckout: false };
export function resetStripe() { stripeCalls.checkout.length = 0; stripeCalls.subsUpdate.length = 0; stripeCalls.couponsCreated.length = 0; stripeCoupons.clear(); stripeBehaviour.failCheckout = false; }
