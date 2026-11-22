import { useI18n } from '../i18n';

export function LanguageControl({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className={`language-control${compact ? ' language-control-compact' : ''}`}>
      {!compact && <span>{t('language')}</span>}
      <select
        value={language}
        aria-label={t('language')}
        title={t('language')}
        onChange={(event) => setLanguage(event.currentTarget.value === 'vi' ? 'vi' : 'en')}
      >
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
      </select>
    </label>
  );
}
