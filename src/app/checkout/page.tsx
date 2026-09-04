'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Check,
  Sparkles,
  Lock,
  ArrowRight,
  ChevronLeft,
  Tag,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanTier = 'researcher_pro' | 'lab_multiseat';

const PLAN_DETAILS: Record<
  PlanTier,
  {
    name: string;
    tagline: string;
    basePrice: number;
    billingPeriod: string;
    seats: string;
    features: string[];
    popular?: boolean;
  }
> = {
  researcher_pro: {
    name: 'Researcher Pro',
    tagline: 'Individual license for independent researchers, postdocs, and PhD authors.',
    basePrice: 59,
    billingPeriod: '/ year',
    seats: '1 Individual Seat',
    features: [
      'Unlimited LaTeX manuscript & chapter pre-flight audits',
      'Neural NLI claim entailment & verbatim source citation',
      'Deterministic CrossRef & dead DOI integrity dragnet',
      'Automated 1-click BibTeX syntax & key repair',
      'Downloadable PI pre-submission executive compliance dossier',
    ],
    popular: true,
  },
  lab_multiseat: {
    name: 'Lab Multi-Seat',
    tagline: 'Shared license for research labs, PI groups, and grant consortia.',
    basePrice: 299,
    billingPeriod: '/ year',
    seats: '6 Research Seats (~$49/seat)',
    features: [
      'Everything in Researcher Pro for 6 lab members',
      'Centralized PI compliance dashboard & citation risk monitor',
      'Shared Zotero group synchronization & custom .bib database',
      'Direct university grant / PO invoice documentation',
      'Priority academic support & onboarding',
    ],
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanTier) || 'researcher_pro';

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(
    initialPlan in PLAN_DETAILS ? initialPlan : 'researcher_pro'
  );

  useEffect(() => {
    const requestedPlan = searchParams.get('plan');
    if (requestedPlan === 'departmental' || requestedPlan === 'enterprise') {
      router.replace('/contact?type=enterprise');
    }
  }, [searchParams, router]);

  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validPromoCodes = new Set(['PHD2026', 'NEURIPS', 'STUDENT10', 'ICML2026', 'RESEARCHER']);

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlan !== 'researcher_pro') {
      setDiscountError('Promo codes apply exclusively to Researcher Pro individual licenses.');
      return;
    }

    const code = discountCode.trim().toUpperCase();
    if (validPromoCodes.has(code)) {
      setIsDiscountApplied(true);
      setDiscountError(null);
    } else {
      setDiscountError('Invalid promo code. Please check and try again.');
      setIsDiscountApplied(false);
    }
  };

  const currentPlan = PLAN_DETAILS[selectedPlan] || PLAN_DETAILS.researcher_pro;
  const finalPrice =
    selectedPlan === 'researcher_pro' && isDiscountApplied
      ? currentPlan.basePrice - 10
      : currentPlan.basePrice;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address for your license token delivery.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          customerEmail: email.trim(),
          discountCode: selectedPlan === 'researcher_pro' && isDiscountApplied ? discountCode.trim().toUpperCase() : undefined,
          returnUrl: `${window.location.origin}/workbench?payment_success=1`,
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        if (data.mode === 'sandbox_dev' && data.checkoutUrl) {
          const claimRes = await fetch(data.checkoutUrl);
          const claimData = await claimRes.json();
          if (claimData.token) {
            localStorage.setItem('citeassist_pro_token', claimData.token);
            localStorage.setItem('citeassist_pro_tier', selectedPlan);
            router.push('/workbench?payment_success=1');
            return;
          }
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }

      throw new Error(data.message || 'Unable to initiate secure checkout session');
    } catch (err: any) {
      console.error('[Checkout Error]:', err);
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Header Bar */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur px-4 sm:px-8 flex items-center justify-between z-20 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-xs font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Overview</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Lock size={12} className="text-emerald-400" />
          <span>256-Bit TLS Encrypted Checkout</span>
        </div>
      </header>

      {/* Main 2-Column Checkout Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN: Order Summary & Features (7 Cols) ────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold shadow-xs">
                <ShieldCheck size={12} />
                <span>Academic License Activation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Complete Your Pre-Flight Subscription
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Immunize your manuscript against desk-rejection. Catch retracted citations, dead DOIs, and ungrounded empirical assertions.
              </p>
            </div>

            {/* Plan Switcher Pills */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('researcher_pro');
                  setErrorMsg(null);
                }}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer',
                  selectedPlan === 'researcher_pro'
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <span>Researcher Pro</span>
                <span className="text-[10px] font-mono text-emerald-400 font-normal">$59/yr (1 User)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlan('lab_multiseat');
                  setIsDiscountApplied(false);
                  setDiscountError(null);
                  setErrorMsg(null);
                }}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer',
                  selectedPlan === 'lab_multiseat'
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <span>Lab Multi-Seat</span>
                <span className="text-[10px] font-mono text-cyan-400 font-normal">$299/yr (6 Seats)</span>
              </button>
            </div>

            {/* Selected Plan Feature Breakdown Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" />
                    <span>{currentPlan.name}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{currentPlan.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-white font-mono">${finalPrice}</div>
                  <div className="text-[11px] text-zinc-500">{currentPlan.billingPeriod}</div>
                </div>
              </div>

              <div className="border-t border-zinc-800/60 pt-4 space-y-2.5">
                <div className="text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                  Included Verification Capabilities:
                </div>
                {currentPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Secret Promo Coupon Input (Only for Researcher Pro) */}
            {selectedPlan === 'researcher_pro' && (
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Tag size={13} className="text-amber-400" />
                    <span>Have a promotional discount code?</span>
                  </span>
                  {isDiscountApplied && (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Check size={12} /> -$10 Applied
                    </span>
                  )}
                </div>

                <form onSubmit={handleApplyDiscount} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter promo code..."
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-zinc-700"
                  >
                    Apply
                  </button>
                </form>

                {discountError && <p className="text-[11px] text-rose-400">{discountError}</p>}
              </div>
            )}

            {/* Academic Trust & Privacy Assurance */}
            <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-mono text-zinc-400">
              <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="text-emerald-400 font-bold mb-0.5">30-Day Guarantee</div>
                <div>Full refund if not satisfied</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="text-emerald-400 font-bold mb-0.5">Zero Data Retention</div>
                <div>Air-gapped AST parsing</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <div className="text-emerald-400 font-bold mb-0.5">Ed25519 Token</div>
                <div>Cryptographic license</div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Customer Details & Checkout Form (5 Cols) ──────── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-400" />
                  <span>Account & License Delivery</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Your cryptographic seat token will be generated upon confirmation.
                </p>
              </div>

              <form onSubmit={handleProceedToPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Academic or Work Email <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="researcher@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Receipt and cryptographic token hash will be dispatched to this email.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    University / Lab / Institution (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford University / Max Planck Institute"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Itemized Order Breakdown */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>{currentPlan.name} (Annual)</span>
                    <span>${currentPlan.basePrice}.00</span>
                  </div>

                  {isDiscountApplied && selectedPlan === 'researcher_pro' && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Promo Discount</span>
                      <span>-$10.00</span>
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-bold text-white">
                    <span>Total Due Today</span>
                    <span className="text-emerald-400">${finalPrice}.00</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <span>Initializing Secure Gateway...</span>
                  ) : (
                    <>
                      <span>Proceed to Payment (${finalPrice})</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  By confirming, you agree to the{' '}
                  <Link href="/terms" className="underline hover:text-zinc-300">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:text-zinc-300">
                    Zero-Knowledge Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono text-xs">
          Loading Checkout...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
