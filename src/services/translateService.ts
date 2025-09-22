// Lightweight client-side translation helpers with simple in-memory caching.
// Uses public LibreTranslate endpoints with failover; override via VITE_TRANSLATE_API_URL.

import type { FoodQualityResult } from './geminiService';

const ENV_ENDPOINT = (import.meta as any).env?.VITE_TRANSLATE_API_URL as string | undefined;
const DEFAULT_ENDPOINTS = [
  ENV_ENDPOINT?.trim(),
  'https://libretranslate.de/translate',
  'https://translate.astian.org/translate',
  'https://libretranslate.com/translate'
].filter(Boolean) as string[];

// Module-level cache to avoid re-translating the same lists repeatedly in one session.
const cache = new Map<string, string[]>();
const CACHE_VERSION = 'v2';

async function translateOne(q: string, targetLang: string, sourceLang?: string): Promise<string> {
  const tgt = String(targetLang || 'en').split('-')[0];
  const src = sourceLang || 'auto';
  const body = JSON.stringify({ q, source: src, target: tgt, format: 'text' });

  // If source and target appear the same, don't translate
  if (src !== 'auto' && src === tgt) return q;

  // Try each endpoint with a short timeout
  for (const endpoint of DEFAULT_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data: any = await res.json();
      const tx = data?.translatedText;
      if (typeof tx === 'string' && tx.length) return tx;
    } catch {
      // try next endpoint
    }
  }
  // Fallback: try MyMemory API (best-effort, no key, rate-limited)
  try {
    // Guess source script for better language pairing in fallback
    const guessLangFromText = (text: string): string => {
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
      if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
      return 'en';
    };
    const mmSrc = src === 'auto' ? guessLangFromText(q) : src;
    if (mmSrc === tgt) return q; // MyMemory requires distinct languages
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(mmSrc)}|${encodeURIComponent(tgt)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, { signal: controller.signal, headers: { 'accept': 'application/json' } });
    clearTimeout(timer);
    if (r.ok) {
      const j: any = await r.json();
      const tx = j?.responseData?.translatedText as string | undefined;
      const isErrorText = typeof tx === 'string' && /PLEASE SELECT TWO DISTINCT LANGUAGES|INVALID LANGUAGE PAIR/i.test(tx);
      if (!isErrorText && typeof tx === 'string' && tx.length) return tx;
    }
  } catch {
    // ignore
  }
  // All endpoints failed — return original
  return q;
}

export async function translateList(
  texts: string[],
  targetLang: string,
  sourceLang?: string
): Promise<string[]> {
  if (!texts?.length) return [];
  const tgt = String(targetLang || 'en').split('-')[0];
  const key = JSON.stringify({ v: CACHE_VERSION, texts, tgt, sourceLang: sourceLang || 'auto' });
  const cached = cache.get(key);
  if (cached) return cached;

  const results: string[] = [];
  for (const q of texts) {
    const tx = await translateOne(q, tgt, sourceLang);
    results.push(tx);
  }
  cache.set(key, results);
  return results;
}

export async function translateAnalysis(
  analysis: FoodQualityResult,
  targetLang: string
): Promise<FoodQualityResult> {
  if (!analysis) return analysis;
  // Use auto-detect for source language; model may mislabel language
  const [reasons, recommendations] = await Promise.all([
    translateList(analysis.reasons || [], targetLang, undefined),
    translateList(analysis.recommendations || [], targetLang, undefined)
  ]);
  return { ...analysis, reasons, recommendations, language: targetLang };
}
