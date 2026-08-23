'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { LLMProvider } from '@/lib/models';

export const SettingsModal: React.FC = () => {
  const store = useSettingsStore();
  const [localKeys, setLocalKeys] = useState({
    google: store.googleApiKey,
    anthropic: store.anthropicApiKey,
    openai: store.openaiApiKey,
    openrouter: store.openRouterApiKey,
    email: store.politePoolEmail,
  });

  useEffect(() => {
    setLocalKeys({
      google: store.googleApiKey, 
      anthropic: store.anthropicApiKey,
      openai: store.openaiApiKey, 
      openrouter: store.openRouterApiKey,
      email: store.politePoolEmail
    });
  }, [store.isSettingsOpen]);

  if (!store.isSettingsOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.setKeys({
      googleApiKey: localKeys.google.trim(),
      anthropicApiKey: localKeys.anthropic.trim(),
      openaiApiKey: localKeys.openai.trim(),
      openRouterApiKey: localKeys.openrouter.trim(),
      politePoolEmail: localKeys.email.trim(),
    });
    store.closeSettings();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full text-neutral-200 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/60">
          <h2 className="text-sm font-semibold text-white">Workbench Settings</h2>
          <button onClick={store.closeSettings} className="text-neutral-400 hover:text-white transition-colors">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-800">
            <div>
              <label className="text-[11px] text-neutral-400 font-medium block mb-1">Active LLM Engine</label>
              <select
                value={store.activeProvider}
                onChange={(e) => store.setActiveEngine(e.target.value as LLMProvider, store.activeModelId)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1.5 text-white"
              >
                <option value="google">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter (Free / Multi)</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-neutral-400 flex justify-between"><span>OpenRouter API Key</span></label>
              <input type="password" value={localKeys.openrouter} onChange={e => setLocalKeys({...localKeys, openrouter: e.target.value})} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-white font-mono" placeholder="sk-or-v1..." />
              <p className="text-[10px] text-neutral-500 mt-1">
                OpenRouter requires an API key to authenticate requests, even for free-tier models. Usage is free, but standard rate limits apply.
              </p>
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 flex justify-between"><span>Google Gemini API Key</span></label>
              <input type="password" value={localKeys.google} onChange={e => setLocalKeys({...localKeys, google: e.target.value})} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-white font-mono" placeholder="AIzaSy..." />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 flex justify-between"><span>Anthropic API Key</span></label>
              <input type="password" value={localKeys.anthropic} onChange={e => setLocalKeys({...localKeys, anthropic: e.target.value})} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-white font-mono" placeholder="sk-ant-..." />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 flex justify-between"><span>OpenAI API Key</span></label>
              <input type="password" value={localKeys.openai} onChange={e => setLocalKeys({...localKeys, openai: e.target.value})} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-white font-mono" placeholder="sk-proj-..." />
            </div>
            <div>
              <label className="text-[11px] text-neutral-400 flex justify-between"><span>Polite Pool Email (Crossref)</span></label>
              <input type="email" value={localKeys.email} onChange={e => setLocalKeys({...localKeys, email: e.target.value})} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-1.5 text-white" placeholder="admin@recite.ai" />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-neutral-800">
            <button type="submit" className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-medium transition-colors">Save Credentials</button>
          </div>
        </form>
      </div>
    </div>
  );
};
