'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReciteStore } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';
import { ThemeProvider } from '@/components/ThemeProvider';
import LandingPage from '@/components/landing/LandingPage';

export default function RootPage() {
  const router = useRouter();

  // Backward-compatible deep-link query detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'workbench' || params.get('workbench') === '1') {
        router.push('/workbench');
      }
    }
  }, [router]);

  const handleOpenWorkspaceFromLanding = () => {
    router.push('/workbench');
  };

  const handleLoadDemoFromLanding = () => {
    const {
      setWorkspaceStatus,
      setRawText,
      setParsedText,
      setMathBlocks,
      setClaims,
      setDocumentTitle,
      setFileFormat,
      mountWorkspace,
      mountBibTex,
    } = useReciteStore.getState();

    setWorkspaceStatus('MOUNTING');
    const { text: parsed, mathBlocks } = parseMathBlocks(DEMO_MANUSCRIPT);
    setRawText(DEMO_MANUSCRIPT);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setClaims(DEMO_CLAIMS);
    setDocumentTitle('Quantum Spin Dynamics (Draft).tex');
    setFileFormat('tex');
    mountWorkspace('Quantum Spin Dynamics (Draft).tex', 14200);
    mountBibTex('quantum_references.bib', DEMO_BIBTEX);
    setWorkspaceStatus('MOUNTED');
    router.push('/workbench');
  };

  const handleFileUploadFromLanding = async (file: File) => {
    const {
      setWorkspaceStatus,
      setRawText,
      setParsedText,
      setMathBlocks,
      setDocumentTitle,
      setFileFormat,
      mountWorkspace,
    } = useReciteStore.getState();

    setWorkspaceStatus('MOUNTING');
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder('utf-8').decode(buffer);
      const { text: parsed, mathBlocks } = parseMathBlocks(text);
      setRawText(text);
      setParsedText(parsed);
      setMathBlocks(mathBlocks);
      setDocumentTitle(file.name);
      setFileFormat(file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.txt') ? 'txt' : 'tex');
      mountWorkspace(file.name, file.size);
      setWorkspaceStatus('MOUNTED');
      router.push('/workbench');
    } catch (e) {
      console.error('[LandingPage] Failed to parse uploaded file:', e);
      router.push('/workbench');
    }
  };

  return (
    <ThemeProvider>
      <LandingPage
        onOpenWorkspace={handleOpenWorkspaceFromLanding}
        onLoadDemo={handleLoadDemoFromLanding}
        onFileUpload={handleFileUploadFromLanding}
      />
    </ThemeProvider>
  );
}
