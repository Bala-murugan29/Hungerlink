// Translation service using Microsoft Translator API with fallback to MyMemory
// Uses Microsoft Translator for better quality and reliability

import type { FoodQualityResult } from './geminiService';

// Microsoft Translator API endpoint
const MICROSOFT_TRANSLATE_URL = 'https://api.cognitive.microsofttranslator.com/translate';
const MICROSOFT_API_KEY = (import.meta as any).env?.VITE_MICROSOFT_TRANSLATOR_KEY as string | undefined;

// Fallback to MyMemory if Microsoft API fails
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

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

// Microsoft Translator API call
async function translateWithMicrosoft(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
  if (!MICROSOFT_API_KEY) {
    console.warn('[TranslateService] Microsoft API key not provided, falling back to MyMemory');
    return translateWithMyMemory(text, targetLang, sourceLang);
  }

  try {
    const params = new URLSearchParams({
      'api-version': '3.0',
      'to': targetLang
    });
    
    if (sourceLang !== 'auto') {
      params.append('from', sourceLang);
    }

    const response = await fetch(`${MICROSOFT_TRANSLATE_URL}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': MICROSOFT_API_KEY,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Region': 'global'
      },
      body: JSON.stringify([{ Text: text }])
    });

    if (!response.ok) {
      throw new Error(`Microsoft Translator API error: ${response.status}`);
    }

    const result = await response.json();
    const translatedText = result[0]?.translations[0]?.text;
    
    if (translatedText) {
      console.log(`[TranslateService] Microsoft Translator: "${text}" -> "${translatedText}" (${sourceLang}->${targetLang})`);
      return translatedText;
    }
    
    throw new Error('No translation returned from Microsoft API');
  } catch (error) {
    console.error('[TranslateService] Microsoft Translator failed:', error);
    return translateWithMyMemory(text, targetLang, sourceLang);
  }
}

// MyMemory fallback
async function translateWithMyMemory(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
  try {
    // Guess source script for better language pairing in fallback
    const guessLangFromText = (text: string): string => {
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
      if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
      return 'en';
    };
    
    const src = sourceLang === 'auto' ? guessLangFromText(text) : sourceLang;
    if (src === targetLang) return text; // MyMemory requires distinct languages
    
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(targetLang)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, { 
      signal: controller.signal, 
      headers: { 'accept': 'application/json' } 
    });
    
    clearTimeout(timer);
    
    if (response.ok) {
      const data: any = await response.json();
      const translatedText = data?.responseData?.translatedText as string | undefined;
      const isErrorText = typeof translatedText === 'string' && 
        /PLEASE SELECT TWO DISTINCT LANGUAGES|INVALID LANGUAGE PAIR/i.test(translatedText);
      
      if (!isErrorText && typeof translatedText === 'string' && translatedText.length) {
        console.log(`[TranslateService] MyMemory fallback: "${text}" -> "${translatedText}" (${src}->${targetLang})`);
        return translatedText;
      }
    }
  } catch (error) {
    console.error('[TranslateService] MyMemory fallback failed:', error);
  }
  
  // Final fallback: return original text
  console.warn(`[TranslateService] All translation methods failed, returning original text: "${text}"`);
  return text;
}

// Main translation function with retry logic for better script matching
async function translateText(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
  const tgt = String(targetLang || 'en').split('-')[0];
  const src = sourceLang || 'auto';

  // If source and target are the same, don't translate
  if (src !== 'auto' && src === tgt) return text;

  // First attempt with Microsoft Translator
  let result = await translateWithMicrosoft(text, tgt, src);
  
  // If target is ta/hi but output isn't in that script and we used auto-detect, retry with explicit English source
  if (!scriptMatches(result, tgt) && src === 'auto' && (tgt === 'ta' || tgt === 'hi') && looksLatin(text)) {
    console.log(`[TranslateService] Script mismatch for ${tgt}, retrying with explicit English source`);
    result = await translateWithMicrosoft(text, tgt, 'en');
  }

  return result;
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
  for (const text of texts) {
    const translated = await translateText(text, tgt, sourceLang);
    results.push(translated);
  }

  // Cache results if they look good for the target language
  const okToCache = results.every((r, idx) => 
    scriptMatches(r, tgt) || !tgt.match(/^(ta|hi)$/) || !looksLatin(texts[idx])
  );
  if (okToCache) cache.set(key, results);
  return results;
}

export async function translateAnalysis(
  analysis: FoodQualityResult,
  targetLang: string
): Promise<FoodQualityResult> {
  if (!analysis) return analysis;
  
  // Normalize target language
  const normalizedTarget = targetLang.split('-')[0].toLowerCase();
  console.log(`[TranslateService] Translating analysis to ${normalizedTarget}`);
  
  // Translate reasons and recommendations using Microsoft Translator
  const reasons: string[] = [];
  const recommendations: string[] = [];
  
  for (const r of (analysis.reasons || [])) {
    const translated = await translateText(r, normalizedTarget);
    reasons.push(translated);
  }
  
  for (const rec of (analysis.recommendations || [])) {
    const translated = await translateText(rec, normalizedTarget);
    recommendations.push(translated);
  }
  
  console.log(`[TranslateService] Translation completed for ${normalizedTarget}`);
  return { ...analysis, reasons, recommendations, language: normalizedTarget };
}
