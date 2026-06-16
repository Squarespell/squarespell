import { log } from '../lib/logger';
import { supabase } from '../db/supabaseClient';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

interface CreateCheckoutSessionParams {
  quizId: string;
  leadId: string;
  amountCents: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

/**
 * Recomputes the price for a price_calculator quiz from trusted server-side
 * data (the quiz's question/option pricing config + the lead's stored
 * answers). This MUST be the source of truth for what gets charged —
 * never trust a client-supplied amount, since it can be edited via devtools
 * or by hitting the checkout API directly with an arbitrary value.
 *
 * Mirrors the calculatePriceTotal() logic in
 * frontend/components/quiz-taker/QuizRunner.tsx — keep both in sync if the
 * pricing model changes.
 */
function computeServerPriceCents(questions: any[], answers: Record<string, any>): number {
  let totalDollars = 0;

  (questions || []).forEach((q: any) => {
    if (q.type === 'range_input') {
      const rangeValue = answers?.[q.id];
      if (rangeValue !== undefined && rangeValue !== null && typeof rangeValue === 'number') {
        totalDollars += rangeValue * (q.value_per_unit ?? 0);
      }
    } else {
      const answerValue = answers?.[q.id];
      if (answerValue) {
        const selectedIds = Array.isArray(answerValue) ? answerValue : [answerValue];
        selectedIds.forEach((id: any) => {
          const option = (q.options || []).find((o: any) => o.id === id);
          if (option && typeof option.value === 'number') {
            totalDollars += option.value;
          }
        });
      }
    }
  });

  // Guard against negative/NaN totals from malformed config or answers
  if (!Number.isFinite(totalDollars) || totalDollars < 0) totalDollars = 0;

  return Math.round(totalDollars * 100);
}

/**
 * Creates a Stripe Checkout Session for quiz payment
 * Stores a pending payment record in quiz_payments
 * Returns the Checkout URL
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ url: string | null; sessionId: string }> {
  const {
    quizId,
    leadId,
    amountCents,
    currency = 'usd',
    successUrl,
    cancelUrl,
    metadata = {}
  } = params;

  try {
    // Get quiz details — including pricing config, since the price MUST be
    // recomputed server-side rather than trusted from the client request.
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, user_id, questions, mode')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new Error('Quiz not found');
    }

    // Get lead details for customer info + their stored answers.
    // Scope by quiz_id too — without this, a caller could pass any lead_id
    // belonging to a completely different quiz/owner and create a checkout
    // session (and Stripe customer_email prefill) for someone else's lead.
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, email, name, answers, quiz_id')
      .eq('id', leadId)
      .eq('quiz_id', quizId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // SECURITY: never trust the client-supplied amountCents. Recompute the
    // charge from the quiz's question/option pricing config and the lead's
    // already-stored answers — both of which are server-controlled. This
    // closes a critical price-tampering hole where a caller could POST any
    // amount_cents value (e.g. 1) directly to the checkout endpoint.
    const serverAmountCents = computeServerPriceCents(quiz.questions as any[], lead.answers as Record<string, any>);

    if (serverAmountCents !== amountCents) {
      log.warn('[Payments] Client amount_cents did not match server-computed price — using server value', {
        quizId,
        leadId,
        clientAmountCents: amountCents,
        serverAmountCents,
      });
    }

    if (serverAmountCents <= 0) {
      throw new Error('Computed payment amount is invalid (must be greater than zero)');
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: serverAmountCents,
            product_data: {
              name: `Quiz Payment: ${quiz.id}`,
              description: 'Payment collected from quiz completion'
            }
          },
          quantity: 1
        }
      ],
      customer_email: lead.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        quiz_id: quizId,
        lead_id: leadId,
        ...metadata
      }
    });

    // Store pending payment record in database
    const { data: payment, error: insertError } = await supabase
      .from('quiz_payments')
      .insert({
        quiz_id: quizId,
        lead_id: leadId,
        stripe_session_id: session.id,
        amount_cents: serverAmountCents,
        currency: currency.toLowerCase(),
        status: 'pending',
        metadata: {
          lead_name: lead.name,
          lead_email: lead.email,
          ...metadata
        }
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to store payment record:', { err: insertError });
      throw new Error('Failed to store payment record');
    }

    return {
      url: session.url,
      sessionId: session.id
    };
  } catch (err: any) {
    log.error('Error creating checkout session:', { err: err });
    throw err;
  }
}

/**
 * Handles Stripe webhook events for quiz payments
 * Updates quiz_payments status based on payment events
 */
export async function handlePaymentWebhook(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Update payment status to completed
        const { error: updateError } = await supabase
          .from('quiz_payments')
          .update({
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_session_id', session.id);

        if (updateError) {
          log.error('Failed to update payment status:', { err: updateError });
        } else {
          log.info(`Payment completed for session ${session.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;

        // Find and update payment record by payment intent ID
        const { error: updateError } = await supabase
          .from('quiz_payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', intent.id);

        if (updateError) {
          log.error('Failed to update failed payment status:', { err: updateError });
        } else {
          log.info(`Payment failed for intent ${intent.id}`);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (err: any) {
    log.error('Error handling payment webhook:', { err: err });
    throw err;
  }
}

/**
 * Gets all payments for a quiz
 */
export async function getPaymentsForQuiz(quizId: string): Promise<any[]> {
  try {
    const { data: payments, error } = await supabase
      .from('quiz_payments')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch payments for quiz:', { err: error });
      return [];
    }

    return payments || [];
  } catch (err: any) {
    log.error('Error fetching quiz payments:', { err: err });
    return [];
  }
}

/**
 * Gets payment status for a specific lead
 */
export async function getPaymentByLead(leadId: string): Promise<any | null> {
  try {
    const { data: payment, error } = await supabase
      .from('quiz_payments')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows" error, which is expected if no payment exists
      log.error('Failed to fetch payment for lead:', { err: error });
      return null;
    }

    return payment || null;
  } catch (err: any) {
    log.error('Error fetching lead payment:', { err: err });
    return null;
  }
}

/**
 * Refunds a payment
 */
export async function refundPayment(paymentId: string): Promise<boolean> {
  try {
    // Get payment details
    const { data: payment, error: fetchError } = await supabase
      .from('quiz_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      log.error('Payment not found:', { err: fetchError });
      return false;
    }

    // Can only refund completed payments
    if (payment.status !== 'completed' || !payment.stripe_payment_intent_id) {
      log.error('Cannot refund payment with status:', { err: payment.status });
      return false;
    }

    // Create refund in Stripe
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id
    });

    // Update payment status
    const { error: updateError } = await supabase
      .from('quiz_payments')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      log.error('Failed to update refunded payment status:', { err: updateError });
      return false;
    }

    log.info(`Payment refunded: ${paymentId}`);
    return true;
  } catch (err: any) {
    log.error('Error refunding payment:', { err: err });
    return false;
  }
}
