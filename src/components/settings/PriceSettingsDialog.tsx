import React from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Divider,
} from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';

import type { ResolvedPriceSettings } from '@/hooks';

import { CompanySection } from './CompanySection';
import { SupplierSection } from './SupplierSection';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolved: ResolvedPriceSettings;
  onPostalCodeChange: (postalCode: number | null) => void;
  onCompanyChange: (companyId: string | null) => void;
  onProductChange: (productId: string | null) => void;
  onClearAll: () => void;
};

export const PriceSettingsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  resolved,
  onPostalCodeChange,
  onCompanyChange,
  onProductChange,
  onClearAll,
}) => {
  const closeButton = (
    <DialogTrigger disableButtonEnhancement>
      <Button
        appearance="subtle"
        aria-label="Close"
        icon={<Dismiss20Regular />}
      />
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface style={{ maxWidth: 450 }}>
        <DialogBody>
          <DialogTitle action={closeButton}>Price Settings</DialogTitle>
          <DialogContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SupplierSection
                postalCode={resolved.postalCode}
                supplier={resolved.supplier}
                onPostalCodeChange={onPostalCodeChange}
              />

              <Divider />

              <CompanySection
                priceArea={resolved.priceArea}
                company={resolved.company}
                product={resolved.product}
                onCompanyChange={onCompanyChange}
                onProductChange={onProductChange}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClearAll}>
              Clear All
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary">Done</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
