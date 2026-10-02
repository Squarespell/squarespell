'use client';

/**
 * /dashboard/referrals - hidden from navigation until the referral program is wired end to end.
 *
 * What is missing (so the page must not promise a reward): sign-up never records ?ref= codes, nothing marks a referral
 * as converted when the referred account subscribes, there is no account-credit ledger to pay a reward into, and the
 * referral tables are not defined in the repository migrations. Old links to this page land on this notice.
 */

import { DashboardShell } from '../_components/DashboardShell';
import { EmptyState, PrimaryButton, SettingsTabs } from '../_components/PageShell';

export default function ReferralsPage() {
  return (
    <DashboardShell title="Referrals">
      <SettingsTabs />
      <EmptyState
        title="Referrals are not available yet"
        body="We are still building the referral program, so referral links and rewards are switched off for now. Nothing you share today will be tracked or rewarded."
        action={<PrimaryButton href="/dashboard/settings">Back to settings</PrimaryButton>}
      />
    </DashboardShell>
  );
}
