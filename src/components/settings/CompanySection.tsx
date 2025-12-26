import React from 'react';

import {
  Dropdown,
  Option,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Building20Regular,
  Box20Regular,
  LeafOne20Regular,
} from '@fluentui/react-icons';

import { usePriceSettings } from '@/contexts';
import { getMockCompanies } from '@/utils';

export const CompanySection: React.FC = () => {
  const { resolved, setCompanyId, setProductId } = usePriceSettings();
  const { priceArea, company, product } = resolved;

  if (!priceArea) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text weight="semibold">Company (Elselskab)</Text>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Select a supplier first to see available companies
        </Text>
      </div>
    );
  }

  const companies = getMockCompanies(priceArea);
  const companyDisplayValue = company?.name ?? 'Select company';

  const productDisplayValue = product
    ? `${product.name}${product.isGreen ? ' 🌱' : ''}`
    : 'Select product';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Company (Elselskab)</Text>

      {/* Company dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Dropdown
          value={companyDisplayValue}
          onOptionSelect={(_, data) => {
            setCompanyId(data.optionValue ?? null);
          }}
          placeholder="Select company"
          style={{ flex: 1 }}
        >
          {companies.map(c => (
            <Option key={c.id} value={c.id} text={c.name}>
              <div>
                <div>{c.name}</div>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {c.products.length} product{c.products.length !== 1 ? 's' : ''}
                </Text>
              </div>
            </Option>
          ))}
        </Dropdown>
      </div>

      {/* Product dropdown - only shown when company is selected */}
      {company && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
            <Dropdown
              value={productDisplayValue}
              onOptionSelect={(_, data) => {
                setProductId(data.optionValue ?? null);
              }}
              placeholder="Select product"
              style={{ flex: 1 }}
            >
              {company.products.map(p => (
                <Option key={p.id} value={p.id} text={p.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.isGreen && (
                      <LeafOne20Regular style={{ color: tokens.colorPaletteGreenForeground1 }} />
                    )}
                    <div>
                      <div>{p.name}</div>
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        +{p.surcharge.toFixed(2)} kr/kWh · {p.subscriptionMonthly} kr/md
                      </Text>
                    </div>
                  </div>
                </Option>
              ))}
            </Dropdown>
          </div>

          {/* Selected product details */}
          {product && (
            <div
              style={{
                padding: 12,
                background: tokens.colorNeutralBackground3,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {product.isGreen && (
                <LeafOne20Regular style={{ color: tokens.colorPaletteGreenForeground1 }} />
              )}
              <div>
                <Text weight="semibold" style={{ display: 'block' }}>
                  {company.name} - {product.name}
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  Surcharge: +{product.surcharge.toFixed(2)} kr/kWh · Monthly: {product.subscriptionMonthly} kr
                  {product.isGreen && ' · Green energy'}
                </Text>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
