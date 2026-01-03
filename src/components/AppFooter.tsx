import React, { useState } from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Link,
  Text,
  tokens,
} from '@fluentui/react-components';
import { Bot16Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { Stack } from '@/components/ui';
import { usePricesQuery } from '@/hooks';

export const AppFooter: React.FC = () => {
  const { t } = useTranslation();
  const { data: priceResult } = usePricesQuery();
  const isMockedData = priceResult?.isMocked;
  const [open, setOpen] = useState(false);

  return (
    <footer
      style={{
        padding: `${tokens.spacingHorizontalM} ${tokens.spacingHorizontalL}`,
        color: tokens.colorNeutralForeground3,
        fontSize: 12,
      }}
    >
      <Stack horizontal justify="center" align="center" gap={tokens.spacingHorizontalS}>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
          {t('about.madeWith')} <Bot16Regular /> {t('about.inDenmark')}
        </Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground4 }}>•</Text>
        <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Link
              as="button"
              style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}
            >
              {t('about.about')}
            </Link>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle
                action={
                  <DialogTrigger action="close">
                    <Button
                      appearance="subtle"
                      aria-label={t('common.close')}
                      icon={<Dismiss24Regular />}
                    />
                  </DialogTrigger>
                }
              >
                {t('about.title')}
              </DialogTitle>
              <DialogContent>
                <Stack gap={tokens.spacingHorizontalL}>
                  <Text>
                    {t('about.description')}
                  </Text>

                  <div>
                    <Text weight="semibold" block style={{ marginBottom: tokens.spacingHorizontalXS }}>
                      {t('about.builtWith')}
                    </Text>
                    <Text>
                      {t('about.builtWithDescription')}{' '}
                      <Link href="https://claude.ai" target="_blank" rel="noopener noreferrer">
                        {t('about.builtWithClaude')}
                      </Link>
                      {t('about.builtWithSuffix')}
                    </Text>
                  </div>

                  <div>
                    <Text weight="semibold" block style={{ marginBottom: tokens.spacingHorizontalXS }}>
                      {t('about.dataSource')}
                    </Text>
                    <Text>
                      {t('about.dataSourceDescription')}{' '}
                      <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
                        Strømligning.dk
                      </Link>
                    </Text>
                    {isMockedData && (
                      <div style={{ marginTop: tokens.spacingHorizontalS }}>
                        <Badge appearance="filled" color="warning">
                          {t('about.usingMockData')}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Text weight="semibold" block style={{ marginBottom: tokens.spacingHorizontalXS }}>
                      {t('about.openSource')}
                    </Text>
                    <Text>
                      {t('about.openSourceDescription')}{' '}
                      <Link
                        href="https://github.com/mkholt/ChargeCalculator"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('about.viewOnGitHub')}
                      </Link>
                    </Text>
                  </div>

                  <Text
                    size={200}
                    style={{ color: tokens.colorNeutralForeground3, marginTop: tokens.spacingHorizontalS }}
                  >
                    © {new Date().getFullYear()} Morten Holt
                  </Text>
                </Stack>
              </DialogContent>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </Stack>
    </footer>
  );
};
