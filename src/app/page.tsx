'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Crosshair, FileText, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  // --- File Processing ---
  const processFile = async (file: File) => {
    setIsUploading(true);
    
    // In a full implementation, you would:
    // 1. FormData.append('file', file)
    // 2. fetch('/api/ingest', { method: 'POST', body: formData })
    // 3. Save response to Zustand store
    // 4. router.push('/dashboard')
    
    // For now, we simulate the network delay then route to dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  const loadDemo = () => {
    // Simply route to dashboard, which is configured to load demo data on mount if empty
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Navbar */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Crosshair className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="font-bold tracking-widest text-lg uppercase text-zinc-100">
            ReciteAI
          </h1>
        </div>
        <div className="text-xs font-mono text-zinc-500">
          INSTITUTIONAL MANUSCRIPT VERIFICATION
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background Grid Pattern (Laboratory Aesthetic) */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-zinc-950 pointer-events-none" />

        <div className="relative z-10 max-w-2xl w-full space-y-8">
          
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-serif text-white tracking-tight">
              Pre-Flight Citation Defense.
            </h2>
            <p className="text-zinc-400 font-mono text-sm max-w-lg mx-auto leading-relaxed">
              Drop your manuscript. ReciteAI autonomously maps uncited claims, isolates KaTeX boundaries, and flags retraction traps before peer review.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              "relative group flex flex-col items-center justify-center w-full h-72 rounded-lg border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
              isDragging 
                ? "border-emerald-400 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-600 hover:bg-zinc-900/50",
              isUploading && "pointer-events-none border-emerald-500/30 bg-zinc-900/80"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept=".tex,.latex,.docx,.txt,.md" 
            />

            {isUploading ? (
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-10 h-10 text-emerald-400 animate-pulse" />
                <div className="text-center font-mono text-xs">
                  <p className="text-emerald-400 font-bold mb-1">INGESTING MANUSCRIPT</p>
                  <p className="text-zinc-500">Parsing math blocks and normalizing format...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-zinc-700 transition-transform">
                  <UploadCloud className="w-8 h-8 text-zinc-400 group-hover:text-zinc-300" />
                </div>
                <h3 className="font-semibold text-zinc-200 mb-2">Click or drag manuscript to upload</h3>
                <p className="text-xs font-mono text-zinc-500 mb-6">Supports .TEX, .DOCX, and .MD up to 25MB</p>
                
                <div className="flex space-x-3 text-[10px] uppercase font-bold tracking-wider">
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">Zero Retention</span>
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">Locally Parsed</span>
                </div>
              </>
            )}
          </div>

          {/* Quick Demo Action */}
          <div className="flex flex-col items-center mt-8 space-y-4">
            <p className="text-xs text-zinc-500 font-mono">OR SKIP UPLOAD AND TEST THE ENGINE</p>
            <button 
              onClick={loadDemo}
              disabled={isUploading}
              className="group flex items-center space-x-2 px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono font-bold hover:bg-emerald-500 hover:text-zinc-950 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>LOAD SAMPLE QUANTUM PHYSICS DRAFT</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}