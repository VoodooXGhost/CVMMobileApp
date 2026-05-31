import { AppLanguage } from './i18n';

const currencyLocaleByLanguage: Record<AppLanguage, string> = {
  en: 'en-MZ',
  pt: 'pt-MZ',
};

export const formatMznCurrency = (value: unknown, language: AppLanguage = 'en') => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/[^0-9.-]/g, ''))
        : 0;

  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat(currencyLocaleByLanguage[language], {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};
