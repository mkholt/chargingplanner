import React, { useState } from 'react';

import {
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

export const AppFooter: React.FC = () => {
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
        Made with <DrinkCoffee16Regular /> in Denmark
      </Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground4 }}>•</Text>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Link
            as="button"
            style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}
          >
            About
          </Link>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle
              action={
                <DialogTrigger action="close">
                  <Button
                    appearance="subtle"
                    aria-label="Close"
                    icon={<Dismiss24Regular />}
                  />
                </DialogTrigger>
              }
            >
              About EV Charging Planner
            </DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Text>
                  A simple tool to help EV owners find the cheapest time to charge
                  their electric vehicle based on hourly electricity prices.
                </Text>

                <div>
                  <Text weight="semibold" block style={{ marginBottom: 4 }}>
                    Data Source
                  </Text>
                  <Text>
                    Electricity prices provided by{' '}
                    <Link href="https://stromligning.dk" target="_blank" rel="noopener noreferrer">
                      Strømligning.dk
                    </Link>
                  </Text>
                </div>

                <div>
                  <Text weight="semibold" block style={{ marginBottom: 4 }}>
                    Open Source
                  </Text>
                  <Text>
                    This project is open source.{' '}
                    <Link
                      href="https://github.com/mkholt/ChargeCalculator"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
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
