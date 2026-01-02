import React from 'react';

import {
  Dropdown,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Globe20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
] as const;

export const LanguageSection: React.FC = () => {
  const { i18n, t } = useTranslation();

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const handleLanguageChange = (_: unknown, data: { optionValue?: string }) => {
    if (data.optionValue) {
      i18n.changeLanguage(data.optionValue);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM }}>
      <Text weight="semibold">{t('settings.language.title')}</Text>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
        <Globe20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Dropdown
          data-testid="language-selector"
          value={`${currentLang.flag} ${currentLang.nativeName}`}
          selectedOptions={[currentLang.code]}
          onOptionSelect={handleLanguageChange}
          style={{ minWidth: 150 }}
        >
          {LANGUAGES.map(lang => (
            <Option key={lang.code} value={lang.code} text={`${lang.flag} ${lang.nativeName}`}>
              {lang.flag} {lang.nativeName}
            </Option>
          ))}
        </Dropdown>
      </div>
    </div>
  );
};
