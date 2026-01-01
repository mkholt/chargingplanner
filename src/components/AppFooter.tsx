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
import { Dismiss24Regular, DrinkCoffee16Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { usePricesQuery } from '@/hooks';

export const AppFooter: React.FC = () => {
  const { t } = useTranslation();
  const { data: priceResult } = usePricesQuery();
  const isMockedData = priceResult?.isMocked;
  const [open, setOpen] = useState(false);

  return (
    <footer
      style={{
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        color: tokens.colorNeutralForeground3,
        fontSize: 12,
      }}
    >
      <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'flex', alignItems: 'center', gap: 4 }}>
        {t('about.madeWith')} <DrinkCoffee16Regular /> {t('about.inDenmark')}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Text>
                  {t('about.description')}
                </Text>

                <div>
                  <Text weight="semibold" block style={{ marginBottom: 4 }}>
                    {t('about.dataSource')}
                  </Text>
                  <Text>
                    {t('about.dataSourceDescription')}{' '}
                    <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
                      Strømligning.dk
                    </Link>
                  </Text>
                  {isMockedData && (
                    <div style={{ marginTop: 8 }}>
                      <Badge appearance="filled" color="warning">
                        {t('about.usingMockData')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <Text weight="semibold" block style={{ marginBottom: 4 }}>
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
                  style={{ color: tokens.colorNeutralForeground3, marginTop: 8 }}
                >
                  © {new Date().getFullYear()} Morten Holt
                </Text>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </footer>
  );
};
