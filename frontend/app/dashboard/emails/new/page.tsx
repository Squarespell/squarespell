'use client';
import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '../../_components/DashboardShell';

import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { DASHBOARD_COLORS as C } from '../../_components/dashboardColors';
import {
  createCampaign, updateCampaign, sendCampaign, previewRecipients, testSendCampaign,
  CampaignMode,
} from '../../../../lib/emails';
import { Stepper, StepKey } from './_components/Stepper';
import { SetupStep, SetupState } from './_steps/SetupStep';
import { AudienceStep, AudienceState } from './_steps/AudienceStep';
import { DesignStep, DesignState, DesignPhase } from './_steps/DesignStep';
import { ReviewStep } from './_steps/ReviewStep';
import { api } from '../../../../lib/api';

function NewCampaignPageInner() {
  var { status } = useDashboardAuth();
  var router = useRouter();
  var shellRef = useRef<HTMLDivElement>(null);

  // Step 1 - Setup
  var [step, setStep] = useState<StepKey>('setup');
  var [setup, setSetup] = useState<SetupState>({ campaignName: '', quizId: '', campaignType: 'blast', dripEmails: [] });

  // Step 2 - Audience
  var [audience, setAudience] = useState<AudienceState>({
    sourceKind: 'quiz', sourceQuizId: '', filters: {}, manualRecipients: '',
  });

  // Step 3 - Design (template + editor merged)
  var [design, setDesign] = useState<DesignState>({
    templateId: '', subject: '', preheader: '', html: '', fromName: '', fromEmail: '',
  });
  // Lift design phase to parent so Back navigation preserves it
  var [designPhase, setDesignPhase] = useState<DesignPhase>('gallery');

  var [mode, setMode] = useState<CampaignMode>('blast');
  var [recipientCount, setRecipientCount] = useState(0);
  var [sending, setSending] = useState(false);
  var [result, setResult] = useState<any>(null);
  var [draftId, setDraftId] = useState<string | null>(null);

  // Scroll to top on step change
  useEffect(function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Auto-fill From Name / From Email from brand kit + user profile on mount
  useEffect(function() {
    Promise.all([
      api.getBrandKit().catch(function() { return null; }),
      api.getUserPlan().catch(function() { return null; }),
    ]).then(function(arr: any[]) {
      var bk = arr[0];
      var profile = arr[1];
      setDesign(function(prev) {
        var updates: Partial<DesignState> = {};
        if (!prev.fromName && bk && bk.site_name) updates.fromName = bk.site_name;
        if (!prev.fromEmail && profile && profile.email) updates.fromEmail = profile.email;
        return Object.keys(updates).length > 0 ? Object.assign({}, prev, updates) : prev;
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep recipient count in sync for the review step
  useEffect(function() {
    if (audience.sourceKind === 'quiz' && audience.sourceQuizId) {
      previewRecipients(audience.sourceQuizId, audience.filters)
        .then(function(r) { setRecipientCount(r.count); }).catch(function() { setRecipientCount(0); });
    } else if (audience.sourceKind === 'manual') {
      setRecipientCount(
        audience.manualRecipients.split(/[\s,;\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.includes('@'); }).length
      );
    } else { setRecipientCount(0); }
  }, [audience]);

  if (status === 'loading') return <DashboardShell><div style={{ padding: 40, color: C.TEXT_SUBTLE }}>Loading...</div></DashboardShell>;

  // --- Step transitions ---

  var handleSetupNext = function() {
    setAudience(function(prev) { return Object.assign({}, prev, { sourceQuizId: setup.quizId }); });
    setStep('audience');
  };

  var handleAudienceNext = function() {
    setStep('design');
  };

  var handleDesignNext = function() {
    setStep('review');
  };

  // --- Save / Send ---

  var saveOrSend = async function(send: boolean) {
    setSending(true); setResult(null);
    try {
      var campaign: any;
      if (draftId) {
        campaign = { id: draftId };
      } else {
        campaign = await createCampaign({
          name: setup.campaignName || design.subject || 'Untitled',
          subject: design.subject,
          from_name: design.fromName,
          from_email: design.fromEmail,
          html: design.html,
          mode: mode,
          source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
          source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
        } as any);
        setDraftId(campaign.id);
      }
      if (!send) { router.push('/dashboard/emails/' + campaign.id); return; }
      var manualList = audience.sourceKind === 'manual'
        ? audience.manualRecipients.split(/[\s,;\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.includes('@'); })
        : undefined;
      var r = await sendCampaign(campaign.id, manualList);
      setResult(r);
      setTimeout(function() { router.push('/dashboard/emails/' + campaign.id); }, 1500);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  };

  var testSend = async function(to: string) {
    var id = draftId;
    if (!id) {
      var draft = await createCampaign({
        name: setup.campaignName || design.subject || 'Untitled',
        subject: design.subject,
        from_name: design.fromName, from_email: design.fromEmail, html: design.html,
        mode: mode, source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
        source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
      } as any);
      id = draft.id;
      setDraftId(id);
    }
    await testSendCampaign(id, to);
  };

  return (
    <DashboardShell contentPadding="20px 36px 56px" hideTopbar>
      <div ref={shellRef}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.TEXT }}>New campaign</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.TEXT_MUTED }}>Setup - Audience - Design - Send</p>
        </div>
        <Stepper current={step} onJump={setStep} />

        {step === 'setup' && (
          <SetupStep
            state={setup}
            setState={function(u) { setSetup(function(s) { return Object.assign({}, s, u); }); }}
            onNext={handleSetupNext}
          />
        )}
        {step === 'audience' && (
          <AudienceStep
            state={audience}
            setState={function(u) { setAudience(function(s) { return Object.assign({}, s, u); }); }}
            onNext={handleAudienceNext}
            onBack={function() { setStep('setup'); }}
          />
        )}
        {step === 'design' && (
          <DesignStep
            state={design}
            setState={function(u) { setDesign(function(s) { return Object.assign({}, s, u); }); }}
            phase={designPhase}
            setPhase={setDesignPhase}
            onNext={handleDesignNext}
            onBack={function() { setStep('audience'); }}
            quizId={setup.quizId}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            audience={audience} design={design}
            setDesign={function(u) { setDesign(function(s) { return Object.assign({}, s, u); }); }}
            mode={mode} setMode={setMode}
            recipientCount={recipientCount}
            onBack={function() { setStep('design'); }}
            onSend={function() { saveOrSend(true); }}
            onSchedule={async function(scheduledAt: string) {
              setSending(true); setResult(null);
              try {
                var id = draftId;
                if (!id) {
                  var draft = await createCampaign({
                    name: setup.campaignName || design.subject || 'Untitled',
                    subject: design.subject,
                    from_name: design.fromName, from_email: design.fromEmail, html: design.html,
                    mode: mode, source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
                    source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
                  } as any);
                  id = draft.id;
                  setDraftId(id);
                }
                await updateCampaign(id, { scheduled_at: scheduledAt, status: 'scheduled' } as any);
                setResult({ scheduled: true, scheduledAt: scheduledAt });
                setTimeout(function() { router.push('/dashboard/emails/' + id); }, 1500);
              } catch (e: any) {
                setResult({ error: e.message });
              } finally {
                setSending(false);
              }
            }}
            onSaveDraft={function() { saveOrSend(false); }}
            onTestSend={testSend}
            sending={sending} result={result}
          />
        )}
      </div>
    </DashboardShell>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<DashboardShell><div style={{ padding: 40, color: C.TEXT_SUBTLE }}>Loading...</div></DashboardShell>}>
      <NewCampaignPageInner />
    </Suspense>
  );
}
