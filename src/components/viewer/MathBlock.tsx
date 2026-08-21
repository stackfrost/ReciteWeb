'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  content: string;
  isDisplay?: boolean;
}

export default function MathBlock({ content, isDisplay = false }: MathBlockProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(content, containerRef.current, {
          displayMode: isDisplay,
          throwOnError: false,
          output: 'html',
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        containerRef.current.textContent = content; // Fallback to raw text
      }
    }
  }, [content, isDisplay]);

  return (
    <span 
      ref={containerRef} 
      className={isDisplay ? "block my-4 text-center overflow-x-auto" : "inline"}
    />
  );
}