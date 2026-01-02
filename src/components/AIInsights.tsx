import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FoodQualityResult } from '../services/geminiService';
import { translateAnalysis } from '../services/translateService';

interface AIInsightsProps {
  analysis?: FoodQualityResult | null;
  targetLang: string; // i18n.language
}

const AIInsights: React.FC<AIInsightsProps> = ({ analysis, targetLang }) => {
  const { t } = useTranslation();
  const [localized, setLocalized] = useState<FoodQualityResult | null>(analysis ?? null);
  const [loading, setLoading] = useState(false);

  // Normalize language codes to base language (e.g., 'en-US' -> 'en')
  const normalizeLanguage = (lang: string) => {
    return lang ? lang.split('-')[0].toLowerCase() : 'en';
  };

  // Heuristic: if the text doesn't appear in the target language script, translate anyway
  const textLooksLikeTarget = (text: string, lang: string) => {
    if (!text) return false;
    const base = normalizeLanguage(lang);
    if (base === 'ta') {
      // Tamil block - check if at least some Tamil characters exist
      return /[\u0B80-\u0BFF]/.test(text);
    }
    if (base === 'hi') {
      // Devanagari block - check if at least some Hindi characters exist
      return /[\u0900-\u097F]/.test(text);
    }
    if (base === 'en') {
      // For English, check if it contains Latin characters and no other scripts
      return /[A-Za-z]/.test(text) && !/[\u0900-\u097F\u0B80-\u0BFF]/.test(text);
    }
    // For other languages, assume it's correct
    return true;
  };

  const needsTranslation = useMemo(() => {
    const hasText = (analysis?.reasons?.length || analysis?.recommendations?.length);
    if (!hasText) return false;
    
    const normalizedTarget = normalizeLanguage(targetLang);
    const normalizedAnalysis = normalizeLanguage(analysis?.language || '');
    
    // Always translate if no target language set
    if (!normalizedTarget) return false;
    
    // Always translate if we don't know the analysis language
    if (!normalizedAnalysis) {
      console.log('[AIInsights] No analysis language detected, will translate');
      return true;
    }
    
    // Translate if languages are different
    if (normalizedAnalysis !== normalizedTarget) {
      console.log(`[AIInsights] Language mismatch: ${normalizedAnalysis} vs ${normalizedTarget}, will translate`);
      return true;
    }
    
    // Same language codes - check if content actually matches the target script
    const combined = `${(analysis?.reasons || []).join(' ')} ${(analysis?.recommendations || []).join(' ')}`.trim();
    const looksCorrect = textLooksLikeTarget(combined, normalizedTarget);
    
    if (!looksCorrect) {
      console.log(`[AIInsights] Content doesn't match expected script for ${normalizedTarget}, will translate`);
    }
    
    return !looksCorrect;
  }, [analysis, targetLang]);


  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!analysis) {
        setLocalized(null);
        return;
      }
      if (!needsTranslation) {
        console.log('[AIInsights] No translation needed, using original analysis');
        setLocalized(analysis);
        return;
      }
      try {
        setLoading(true);
        console.log(`[AIInsights] Starting translation to ${targetLang}...`);
        const tx = await translateAnalysis(analysis, targetLang);
        if (!cancelled) {
          console.log('[AIInsights] Translation completed successfully');
          setLocalized(tx);
        }
      } catch (error) {
        console.error('[AIInsights] Translation failed:', error);
        if (!cancelled) setLocalized(analysis);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [analysis, targetLang, needsTranslation]);

  const hasPoints = (localized?.reasons?.length || localized?.recommendations?.length);

  return (
    <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-semibold text-primary-700 text-base m-0">{t('ai.insights')}</h4>
        {loading && (
          <span className="text-xs text-primary-700">{t('common.loading')}</span>
        )}
      </div>
      {hasPoints ? (
        <>
          {(localized?.reasons?.length ?? 0) > 0 && (
            <ul className="text-sm mb-1 list-disc pl-5">
              {(localized?.reasons ?? []).map((reason: string, idx: number) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
          {(localized?.recommendations?.length ?? 0) > 0 && (
            <ul className="text-xs text-primary-800 list-disc pl-5">
              {(localized?.recommendations ?? []).map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <span className="text-xs text-primary-700">{t('ai.noInsights')}</span>
      )}
    </div>
  );
};

export default AIInsights;
