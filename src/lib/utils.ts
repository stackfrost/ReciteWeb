import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fast string hashing function (DJB2) for content-hash change detection
 */
export function hashString(str: string): string {
  let hash = 5381;
  let i = str.length;

  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Formats large citation counts (e.g., 1420 -> "1.4k", 1200000 -> "1.2M")
 */
export function formatCitationCount(count?: number): string {
  if (count === undefined || count === null) return '0';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Formats author arrays for scientific cards (e.g. "A. Miller, H. Zhang et al.")
 */
export function formatAuthorList(authors?: string[]): string {
  if (!authors || authors.length === 0) return 'Unknown Authors';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

/**
 * Ensures clean DOI link construction
 */
export function formatDoiUrl(doi?: string): string {
  if (!doi) return '#';
  if (doi.startsWith('http')) return doi;
  return `https://doi.org/${doi.replace(/^doi:/i, '')}`;
}

/**
 * Truncates long text strings cleanly at word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  return `${truncated.slice(0, truncated.lastIndexOf(' '))}...`;
}

/**
 * Cooperative scheduling primitive to yield control to the browser/React main thread.
 * Prevents UI freezes during heavy async RAG dragnet and LLM processing loops.
 */
export async function yieldToMain(): Promise<void> {
  if (typeof (globalThis as any)?.scheduler?.yield === 'function') {
    return (globalThis as any).scheduler.yield();
  }
  if (typeof MessageChannel !== 'undefined') {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}