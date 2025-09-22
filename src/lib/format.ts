import i18n from '../i18n';

export const formatDateTime = (value: string | number | Date, options: Intl.DateTimeFormatOptions = {}) => {
  const lang = i18n.resolvedLanguage || 'en';
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', ...options }).format(date);
};
