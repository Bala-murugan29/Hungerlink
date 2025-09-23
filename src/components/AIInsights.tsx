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

  // Heuristic: if the text doesn't appear in the target language script, translate anyway
  const textLooksLikeTarget = (text: string, lang: string) => {
    if (!text) return false;
    const base = lang.split('-')[0];
    if (base === 'ta') {
      // Tamil block
      return /[\u0B80-\u0BFF]/.test(text);
    }
    if (base === 'hi') {
      // Devanagari block
      return /[\u0900-\u097F]/.test(text);
    }
    // For other languages, skip script check
    return true;
  };

  const needsTranslation = useMemo(() => {
    const hasText = (analysis?.reasons?.length || analysis?.recommendations?.length);
    if (!hasText) return false;
    const combined = `${(analysis?.reasons || []).join(' ')} ${(analysis?.recommendations || []).join(' ')}`.trim();
    // Translate if we don't know original language
    if (!analysis?.language) return !!targetLang;
    // Translate if language differs
    if (analysis.language !== targetLang) return true;
    // Same language set, but content may still be in another script (model ignored instruction)
    return !textLooksLikeTarget(combined, targetLang);
  }, [analysis, targetLang]);


  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!analysis) {
        setLocalized(null);
        return;
      }
      if (!needsTranslation) {
        setLocalized(analysis);
        return;
      }
      try {
        setLoading(true);
        const tx = await translateAnalysis(analysis, targetLang);
        if (!cancelled) setLocalized(tx);
      } catch {
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
