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
const CACHE_VERSION = 'v3';

function scriptMatches(text: string, lang: string): boolean {
  const base = String(lang || '').split('-')[0];
  if (!text) return false;
  if (base === 'ta') return /[\u0B80-\u0BFF]/.test(text); // Tamil
  if (base === 'hi') return /[\u0900-\u097F]/.test(text); // Devanagari
  return true; // for other langs, don't enforce
}

function looksLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

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
      const tx = data?.translatedText as string | undefined;
      if (typeof tx === 'string' && tx.length) {
          // If target is ta/hi but output isn't in that script, try explicit English source once
        if (!scriptMatches(tx, tgt) && src === 'auto' && tgt !== 'en') {
            try {
              const bodyEn = JSON.stringify({ q, source: 'en', target: tgt, format: 'text' });
              const res2 = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyEn });
              if (res2.ok) {
                const j2: any = await res2.json();
                const tx2 = j2?.translatedText as string | undefined;
                if (typeof tx2 === 'string' && tx2.length && scriptMatches(tx2, tgt)) return tx2;
              }
            } catch {}
          }
          return tx;
      }
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
      if (!isErrorText && typeof tx === 'string' && tx.length) {
          // If script still mismatches for ta/hi, try forcing en->tgt if we didn't already
        if (!scriptMatches(tx, tgt) && mmSrc !== 'en' && tgt !== 'en') {
            const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|${encodeURIComponent(tgt)}`;
            try {
              const r2 = await fetch(url2, { headers: { 'accept': 'application/json' } });
              if (r2.ok) {
                const j2: any = await r2.json();
                const tx2 = j2?.responseData?.translatedText as string | undefined;
                if (typeof tx2 === 'string' && tx2.length && scriptMatches(tx2, tgt)) return tx2;
              }
            } catch {}
          }
          return tx;
      }
    }
  } catch {
    // ignore
  }
  // All endpoints failed — return original
  return q;
}

// Minimal MyMemory fallback
async function translateWithMyMemory(q: string, tgt: string, src: string): Promise<string | null> {
  try {
    if (src === tgt) return q;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(tgt)}`;
    const r = await fetch(url, { headers: { 'accept': 'application/json' } });
    if (!r.ok) return null;
    const j: any = await r.json();
    const tx = j?.responseData?.translatedText as string | undefined;
    const isErrorText = typeof tx === 'string' && /PLEASE SELECT TWO DISTINCT LANGUAGES|INVALID LANGUAGE PAIR/i.test(tx || '');
    if (isErrorText) return null;
    return (typeof tx === 'string' && tx.length) ? tx : null;
  } catch { return null; }
}

// LibreTranslate-first with script verification and EN-source retry; then MyMemory fallback if still not in script (for ta/hi).
async function translateOneLibreStrict(q: string, targetLang: string, sourceLang?: string): Promise<string> {
  const tgt = String(targetLang || 'en').split('-')[0];
  const tryOnce = async (src: string): Promise<string> => {
    const body = JSON.stringify({ q, source: src, target: tgt, format: 'text' });
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
        const tx = data?.translatedText as string | undefined;
        if (typeof tx === 'string' && tx.length) return tx;
      } catch {
        // try next endpoint
      }
    }
    return q;
  };

  // First attempt with auto-detect
  let out = await tryOnce(sourceLang || 'auto');
  // If not in target script for ta/hi, retry with explicit English source
  if (!scriptMatches(out, tgt) && (tgt === 'ta' || tgt === 'hi')) {
    out = await tryOnce('en');
  }
  // Final fallback: if still not in target script for ta/hi, try MyMemory en->tgt
  if (!scriptMatches(out, tgt) && (tgt === 'ta' || tgt === 'hi')) {
    const mm = await translateWithMyMemory(q, tgt, 'en');
    if (mm && scriptMatches(mm, tgt)) return mm;
  }
  return out;
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
    let tx = await translateOne(q, tgt, sourceLang);

    // If output doesn't look like target script (for ta/hi) and input is Latin, retry forcing English source
  if (!scriptMatches(tx, tgt) && looksLatin(q) && tgt.match(/^(ta|hi)$/)) {
      tx = await translateOne(q, tgt, 'en');
    }

    results.push(tx);
  }

  // Only cache if outputs look acceptable for the target (prevents caching untranslated English)
  const okToCache = results.every((r, idx) => scriptMatches(r, tgt) || !tgt.match(/^(ta|hi)$/) || !looksLatin(texts[idx]));
  if (okToCache) cache.set(key, results);
  return results;
}

export async function translateAnalysis(
  analysis: FoodQualityResult,
  targetLang: string
): Promise<FoodQualityResult> {
  if (!analysis) return analysis;
  // For AI insights: use LibreTranslate only with script verification
  const reasons: string[] = [];
  const recommendations: string[] = [];
  for (const r of (analysis.reasons || [])) {
    reasons.push(await translateOneLibreStrict(r, targetLang));
  }
  for (const rec of (analysis.recommendations || [])) {
    recommendations.push(await translateOneLibreStrict(rec, targetLang));
  }
  return { ...analysis, reasons, recommendations, language: targetLang };
}
