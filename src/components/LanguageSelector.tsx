import React from 'react';

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { ALL_LANGUAGES, LANGUAGES, type LanguageCode } from '@/locales';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLangCode = i18n.language as LanguageCode;
  const currentLang = LANGUAGES[currentLangCode] ?? LANGUAGES.en;

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuButton
          appearance="subtle"
          size="small"
          data-testid="header-language-selector"
        >
          {currentLang.flag}
        </MenuButton>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {ALL_LANGUAGES.map(lang => (
            <MenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
            >
              {lang.flag} {lang.nativeName}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
