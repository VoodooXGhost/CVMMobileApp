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

/** Formats CVM offer amounts using the supplied unit; unknown currencies are never labeled MZN. */
export const formatOfferPrice = (value: unknown, currency: unknown, language: AppLanguage = 'en') => {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(/[^0-9.-]/g, ''))
      : Number.NaN;
  if (!Number.isFinite(numericValue)) return '';

  const unit = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  if (unit === 'MZN') return formatMznCurrency(numericValue, language);

  const formattedValue = new Intl.NumberFormat(currencyLocaleByLanguage[language], {
    maximumFractionDigits: 2,
  }).format(numericValue);
  if (unit === 'POINTS') return `${formattedValue} ${language === 'pt' ? 'pontos' : 'points'}`;
  return unit ? `${formattedValue} ${unit}` : formattedValue;
};
