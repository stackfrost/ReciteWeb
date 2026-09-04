'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Mail,
  Scale,
  Shield,
  Lock,
  Send,
  MessageSquare,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
} from 'lucide-react';

function ContactContent() {
  const searchParams = useSearchParams();
  const inquiryType = searchParams.get('type');

  const [formSent, setFormSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department:
      inquiryType === 'enterprise' || inquiryType === 'departmental'
        ? 'licensing'
        : 'support',
    institution: '',
    message: '',
  });

  useEffect(() => {
    if (inquiryType === 'enterprise' || inquiryType === 'departmental') {
      setFormData((prev) => ({ ...prev, department: 'licensing' }));
    }
  }, [inquiryType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.status === 'success') {
        setFormSent(true);
      } else {
        setSubmitError(data.message || 'Failed to submit inquiry.');
      }
    } catch (err: any) {
      console.error('[Contact Submit Error]:', err);
      setSubmitError('Unable to connect to inquiry server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDepartment = (dept: string) => {
    setFormData((prev) => ({ ...prev, department: dept }));
    const formElement = document.getElementById('inquiry-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-hidden select-none">
      {/* Liquid Mesh Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div
          className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#05070d]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-extrabold text-lg tracking-tight text-white font-sans hover:opacity-90 transition cursor-pointer"
              title="ReciteWeb Home"
            >
              Recite<span className="text-teal-400 font-semibold">Web</span>
            </Link>

            <span className="text-zinc-700">/</span>

            <h1 className="text-xs font-semibold text-zinc-300 tracking-tight">
              Direct Inquiries & Support
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/pricing"
              className="text-zinc-400 hover:text-teal-300 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/privacy"
              className="text-zinc-400 hover:text-teal-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8 relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-8">
          <div className="border-b border-white/[0.08] pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <MessageSquare size={14} />
              <span>Direct Communication Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Get in Touch with the ReciteWeb Team
            </h2>
            <p className="text-xs text-zinc-400">
              Submit your question, grant purchase order request, or feature feedback directly through our portal.
            </p>
          </div>

          {/* Enterprise & Departmental Inquiry Context Banner */}
          {(inquiryType === 'enterprise' || inquiryType === 'departmental') && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-indigo-200">
                <Building2 size={16} className="text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-white">
                    Departmental & Campus Site License Inquiry
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Custom volume pricing, campus SSO integration, dedicated model routing, and institutional SLAs.
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase tracking-wider font-semibold border border-indigo-500/30">
                Custom Quote
              </span>
            </div>
          )}

          {/* Quick Routing Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Support */}
            <button
              type="button"
              onClick={() => selectDepartment('support')}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-teal-500/30 text-left space-y-2 backdrop-blur-md transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-teal-300 transition-colors">
                <HelpCircle size={15} className="text-teal-400" />
                Workbench & Citation Help
              </span>
              <p className="text-[11px] text-zinc-400">
                Help with LaTeX audits, AST parser formatting, and individual seat license keys.
              </p>
              <span className="text-[10px] font-mono text-teal-400 font-semibold inline-block pt-1">
                Click to select category →
              </span>
            </button>

            {/* Card 2: Enterprise & Grants */}
            <button
              type="button"
              onClick={() => selectDepartment('licensing')}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/30 text-left space-y-2 backdrop-blur-md transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-indigo-300 transition-colors">
                <Building2 size={15} className="text-indigo-400" />
                Lab Grants & Department Licenses
              </span>
              <p className="text-[11px] text-zinc-400">
                University PO invoicing, grant documentation (NSF/NIH), and campus seat pools.
              </p>
              <span className="text-[10px] font-mono text-indigo-400 font-semibold inline-block pt-1">
                Click to select category →
              </span>
            </button>

            {/* Card 3: Privacy */}
            <button
              type="button"
              onClick={() => selectDepartment('privacy')}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 text-left space-y-2 backdrop-blur-md transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                <Lock size={15} className="text-emerald-400" />
                Zero Data Retention & Privacy
              </span>
              <p className="text-[11px] text-zinc-400">
                Inquiries regarding ephemeral manuscript processing and zero server retention guarantees.
              </p>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold inline-block pt-1">
                Click to select category →
              </span>
            </button>

            {/* Card 4: Security */}
            <button
              type="button"
              onClick={() => selectDepartment('security')}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/30 text-left space-y-2 backdrop-blur-md transition-all cursor-pointer group"
            >
              <span className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-cyan-300 transition-colors">
                <Shield size={15} className="text-cyan-400" />
                Security & Bug Disclosure
              </span>
              <p className="text-[11px] text-zinc-400">
                Responsible vulnerability disclosures and cryptographic token architecture.
              </p>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold inline-block pt-1">
                Click to select category →
              </span>
            </button>
          </div>

          {/* Direct Message Form */}
          <div id="inquiry-form" className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail size={16} className="text-teal-400" />
              <span>Direct Web Inquiry Form</span>
            </h3>

            {formSent ? (
              <div className="p-5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <CheckCircle2 size={16} className="text-teal-400" />
                  <span>Inquiry Transmitted Successfully</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  Your message has been logged and queued. Our engineering and support desk responds to all academic inquiries within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormSent(false);
                    setFormData({
                      name: '',
                      email: '',
                      department: 'support',
                      institution: '',
                      message: '',
                    });
                  }}
                  className="mt-2 text-xs text-teal-400 underline hover:text-teal-300 cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-zinc-300 font-medium">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Alan Turing"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-medium">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="researcher@university.edu"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-zinc-300 font-medium">Inquiry Category</label>
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white focus:outline-none focus:border-teal-400"
                    >
                      <option value="support" className="bg-[#090d18] text-white">
                        General & Workbench Support
                      </option>
                      <option value="licensing" className="bg-[#090d18] text-white">
                        Lab Multi-Seat & Departmental Inquiries
                      </option>
                      <option value="legal" className="bg-[#090d18] text-white">
                        Legal & Licensing Terms
                      </option>
                      <option value="privacy" className="bg-[#090d18] text-white">
                        Privacy & Data Requests
                      </option>
                      <option value="security" className="bg-[#090d18] text-white">
                        Security Disclosures
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-300 font-medium">
                      Institution / University (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford University / Max Planck"
                      value={formData.institution}
                      onChange={(e) =>
                        setFormData({ ...formData, institution: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your question, quote request, or feedback..."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_6px_15px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSubmitting ? 'Transmitting Message...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Direct Communication Assurance */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1 text-zinc-400 text-[11px]">
            <p className="font-semibold text-white">Direct Founder & Engineering Desk</p>
            <p className="text-zinc-500">
              All messages submitted through this portal are directly monitored by the core project maintainers.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070d] flex items-center justify-center text-zinc-500 font-mono text-xs">
          Loading Inquiries...
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
