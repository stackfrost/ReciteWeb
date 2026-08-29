/**
 * src/app/api/payments/create-checkout/route.ts
 *
 * Dodo Payments Hosted Checkout Session Initiator.
 *
 * Handles:
 *   - Researcher Pro ($59/yr, $49/yr with PHD2026)
 *   - Lab Multi-Seat ($299/yr for 6 seats)
 *
 * Supports live production Dodo Payments API and mock sandbox dev fallback.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { plan = 'researcher_pro', discountCode = '', customerEmail = '', returnUrl } = body;

    const isProduction = process.env.NODE_ENV === 'production';
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_WEBHOOK_SECRET;
    const isDevMode = !apiKey || apiKey.startsWith('dodo_dev_') || apiKey.startsWith('test_placeholder');

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BETTER_AUTH_URL ||
      'http://localhost:3000';

    const normalizedDiscount = discountCode.trim().toUpperCase();
    const validPromoCodes = new Set(['PHD2026', 'NEURIPS', 'STUDENT10', 'ICML2026', 'RESEARCHER']);
    const isProDiscountValid = plan === 'researcher_pro' && validPromoCodes.has(normalizedDiscount);

    // ── 1. Dev / Sandbox Fallback Mode ───────────────────────────────────────
    if (isDevMode) {
      const mockPaymentId = `dodo_dev_${plan}_${Date.now()}`;
      const finalReturnUrl =
        returnUrl ||
        `${appUrl}/workbench?payment_success=1&payment_id=${mockPaymentId}`;

      return NextResponse.json({
        status: 'success',
        mode: 'sandbox_dev',
        paymentId: mockPaymentId,
        checkoutUrl: `${appUrl}/api/payments/claim-session?payment_id=${mockPaymentId}`,
        redirectUrl: finalReturnUrl,
        discountApplied: isProDiscountValid ? 10 : 0,
        amountDue: plan === 'researcher_pro' ? (isProDiscountValid ? 49 : 59) : 299,
      });
    }

    // ── 2. Live Dodo Payments Production Gateway ─────────────────────────────
    const isLiveEnvironment = apiKey.startsWith('live_') || isProduction;
    const dodoApiBase = isLiveEnvironment
      ? 'https://api.dodopayments.com'
      : 'https://test.dodopayments.com';

    const productId =
      plan === 'lab_multiseat'
        ? process.env.DODO_PRODUCT_LAB_ANNUAL || 'p_lab_annual_default'
        : process.env.DODO_PRODUCT_PRO_ANNUAL || 'p_pro_annual_default';

    const dodoPayload: Record<string, any> = {
      product_id: productId,
      quantity: 1,
      return_url: returnUrl || `${appUrl}/workbench?payment_id={payment_id}&payment_status=success`,
      metadata: {
        tier: plan,
        promo_code: isProDiscountValid ? normalizedDiscount : undefined,
        discount_amount: isProDiscountValid ? '10' : '0',
      },
    };

    if (customerEmail) {
      dodoPayload.customer = { email: customerEmail };
    }

    if (isProDiscountValid) {
      dodoPayload.discount_code = normalizedDiscount;
    }

    const dodoResponse = await fetch(`${dodoApiBase}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dodoPayload),
    });

    if (!dodoResponse.ok) {
      const errorText = await dodoResponse.text();
      console.error('[Dodo Payments] Failed to create checkout:', errorText);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to create Dodo Payments checkout session.',
          details: errorText,
        },
        { status: 502 }
      );
    }

    const checkoutData = await dodoResponse.json();
    return NextResponse.json({
      status: 'success',
      mode: 'live',
      checkoutUrl: checkoutData.checkout_url || checkoutData.url,
      paymentId: checkoutData.payment_id || checkoutData.id,
    });
  } catch (error: any) {
    console.error('[Dodo Payments Checkout Error]:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Internal server error during checkout initiation' },
      { status: 500 }
    );
  }
}
