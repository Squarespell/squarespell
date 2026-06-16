'use client';
import { useState } from 'react';

// CRITICAL FIX: this previously fetched a relative '/api/public/quiz/...'
// path, which resolves against the Next.js frontend's own origin
// (app.squarespell.com). That route only exists on the separate Express
// backend (squarespell-api.onrender.com) — see
// backend/src/routes/allRoutes.ts's `quizPaymentsRouter.post('/public/quiz/:slug/checkout', ...)`.
// Every "Pay Now" click was therefore hitting a 404 on the frontend host and
// silently failing the entire payment flow for any payment-enabled quiz.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

interface PaymentStepProps {
  amountCents: number;
  currency?: string;
  leadId: string;
  slug: string;
  accent: string;
  textColor: string;
  bgColor: string;
  font: string;
  onPaymentComplete?: () => void;
  onSkip?: () => void;
  isOptional?: boolean;
}

function formatCurrency(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default function PaymentStep({
  amountCents,
  currency = 'usd',
  leadId,
  slug,
  accent,
  textColor,
  bgColor,
  font,
  onPaymentComplete,
  onSkip,
  isOptional = false
}: PaymentStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current URLs
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const baseUrl = currentUrl.split('?')[0];
      const successUrl = baseUrl + '?payment_status=success';
      const cancelUrl = baseUrl + '?payment_status=cancelled';

      // Create checkout session
      const response = await fetch(`${API_URL}/api/public/quiz/${slug}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: leadId,
          amount_cents: amountCents,
          currency: currency,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { checkout_url } = await response.json();

      if (checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  const style: React.CSSProperties = {
    background: bgColor,
    color: textColor,
    fontFamily: `'${font}', sans-serif`,
    padding: '24px',
    borderRadius: '16px',
    border: `2px solid ${accent}`,
    marginTop: '24px',
    textAlign: 'center'
  };

  return (
    <div style={style}>
      <h2 style={{
        color: accent,
        marginBottom: '16px',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        Ready to get started?
      </h2>

      <p style={{
        opacity: 0.7,
        marginBottom: '24px',
        fontSize: '16px'
      }}>
        Complete your purchase to proceed
      </p>

      <div style={{
        background: `${accent}15`,
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <p style={{
          opacity: 0.6,
          fontSize: '14px',
          marginBottom: '8px'
        }}>
          Total payment
        </p>
        <div style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: accent
        }}>
          {formatCurrency(amountCents, currency)}
        </div>
      </div>

      {error && (
        <div style={{
          background: '#ff4444',
          color: '#fff',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handlePaymentClick}
        disabled={isLoading}
        style={{
          background: isLoading ? `${accent}80` : accent,
          color: '#0a0f05',
          padding: '14px 28px',
          borderRadius: '20px',
          border: 'none',
          fontWeight: 'bold',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '12px',
          opacity: isLoading ? 0.6 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>

      {isOptional && (
        <button
          onClick={onSkip}
          disabled={isLoading}
          style={{
            background: 'transparent',
            color: accent,
            padding: '12px 24px',
            borderRadius: '20px',
            border: `2px solid ${accent}`,
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            width: '100%',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
