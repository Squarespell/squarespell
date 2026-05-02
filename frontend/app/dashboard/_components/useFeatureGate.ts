'use client';

/**
 * useFeatureGate - returns the user's current plan and a gate checker.
 *
 * Usage:
 *   var { plan, canUse, showGate, gateProps } = useFeatureGate();
 *   if (!canUse('abTesting')) showGate('abTesting');
 *   <UpgradeModal {...gateProps} />
 */

import { useState, useEffect, useCallback } from 'react';
import { planHasFeature, isFreeTier, type PlanFeatures } from '@/lib/plans';
import { useDashboardAuth } from './useDashboardAuth';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

type GateFeature = keyof PlanFeatures | 'quizLimit' | 'leadLimit' | 'emailLimit';

export function useFeatureGate() {
  var { token } = useDashboardAuth();
  var [plan, setPlan] = useState<string>('trial');
  var [limits, setLimits] = useState<{ quizzes: number; leads: number; emails: number }>({ quizzes: Infinity, leads: 3000, emails: 3000 });
  var [quizCount, setQuizCount] = useState(0);
  var [gateOpen, setGateOpen] = useState(false);
  var [gateFeature, setGateFeature] = useState<GateFeature>('quizLimit');

  useEffect(function() {
    if (!token) return;
    fetch(API + '/api/user/plan', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setPlan(data.plan || 'free');
        setLimits(data.limits || { quizzes: 1, leads: 100, emails: 50 });
        setQuizCount(data.quiz_count || 0);
      })
      .catch(function() {});
  }, [token]);

  var canUse = useCallback(function(feature: keyof PlanFeatures) {
    return planHasFeature(plan, feature);
  }, [plan]);

  var showGate = useCallback(function(feature: GateFeature) {
    setGateFeature(feature);
    setGateOpen(true);
  }, []);

  var closeGate = useCallback(function() {
    setGateOpen(false);
  }, []);

  var isFree = isFreeTier(plan);

  return {
    plan: plan,
    limits: limits,
    quizCount: quizCount,
    isFree: isFree,
    canUse: canUse,
    showGate: showGate,
    gateProps: {
      open: gateOpen,
      feature: gateFeature,
      currentPlan: plan,
      onClose: closeGate,
    },
  };
}
