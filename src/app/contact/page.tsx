'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Mail, Scale, Shield, Lock, Copy, CheckCircle2, Send, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'support',
    message: ''
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-hidden">
      {/* Liquid Mesh Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb" style={{ animationDelay: '3s' }} />
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
              Contact & Inquiries
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/terms" className="text-zinc-400 hover:text-teal-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-zinc-400 hover:text-teal-300 transition-colors">
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
              <span>Direct Communication Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Get in Touch with ReciteWeb
            </h2>
            <p className="text-xs text-zinc-400">
              For technical support, legal notices, institutional lab licensing, and security disclosures.
            </p>
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Support */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Mail size={15} className="text-teal-400" />
                  General & Workbench Support
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Help with LaTeX audits, license keys, and account inquiries.
              </p>
              <div className="flex items-center justify-between pt-2">
                <code className="text-xs font-mono text-teal-300">support@reciteweb.com</code>
                <button
                  onClick={() => copyToClipboard('support@reciteweb.com')}
                  className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] rounded-lg text-zinc-300 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'support@reciteweb.com' ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Legal */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Scale size={15} className="text-teal-400" />
                  Legal & Corporate Counsel
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Formal legal notices, DMCA inquiries, and copyright matters.
              </p>
              <div className="flex items-center justify-between pt-2">
                <code className="text-xs font-mono text-teal-300">legal@reciteweb.com</code>
                <button
                  onClick={() => copyToClipboard('legal@reciteweb.com')}
                  className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] rounded-lg text-zinc-300 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'legal@reciteweb.com' ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>

            {/* Card 3: Privacy */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Lock size={15} className="text-teal-400" />
                  Data Privacy Officer
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                GDPR/CCPA deletion requests and data subject rights.
              </p>
              <div className="flex items-center justify-between pt-2">
                <code className="text-xs font-mono text-teal-300">privacy@reciteweb.com</code>
                <button
                  onClick={() => copyToClipboard('privacy@reciteweb.com')}
                  className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] rounded-lg text-zinc-300 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'privacy@reciteweb.com' ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>

            {/* Card 4: Security */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Shield size={15} className="text-teal-400" />
                  Security Operations
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Responsible vulnerability disclosure and security architecture.
              </p>
              <div className="flex items-center justify-between pt-2">
                <code className="text-xs font-mono text-teal-300">security@reciteweb.com</code>
                <button
                  onClick={() => copyToClipboard('security@reciteweb.com')}
                  className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] rounded-lg text-zinc-300 transition-colors cursor-pointer"
                  title="Copy email"
                >
                  {copiedEmail === 'security@reciteweb.com' ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Direct Message Form */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <h3 className="text-sm font-bold text-white">Send a Direct Inquiry</h3>
            
            {formSent ? (
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Thank you! Your message has been routed to our team. Standard response SLA is within 24 hours.</span>
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
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Inquiry Category</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="support" className="bg-[#090d18] text-white">General & Workbench Support</option>
                    <option value="licensing" className="bg-[#090d18] text-white">Lab Multi-Seat & Enterprise Inquiries</option>
                    <option value="legal" className="bg-[#090d18] text-white">Legal & Compliance</option>
                    <option value="privacy" className="bg-[#090d18] text-white">Privacy & Data Requests</option>
                    <option value="security" className="bg-[#090d18] text-white">Security Disclosures</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry or request..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_6px_15px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>

          {/* Communication Directory */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1 text-zinc-400 text-[11px]">
            <p className="font-semibold text-white">ReciteWeb</p>
            <p className="text-zinc-500">Electronic Communication & Support Directory</p>
            <p className="text-zinc-500">Inquiries: support@reciteweb.com · legal@reciteweb.com</p>
          </div>

        </div>
      </main>
    </div>
  );
}
