import React, { useMemo, useState } from 'react';

import {
  Combobox,
  Option,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import { LeafOne20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { SelectionCard } from '@/components/settings';
import { usePriceSettings } from '@/contexts';
import { useCompaniesQuery } from '@/hooks';

export const CompanySection: React.FC = () => {
  const { t } = useTranslation();
  const { resolved, setCompany, setProduct } = usePriceSettings();
  const { priceArea, company, product } = resolved;

  const { data: companies = [], isLoading } = useCompaniesQuery(priceArea);
  const [query, setQuery] = useState('');

  // Sort alphabetically and filter by search query
  const filteredCompanies = useMemo(() => {
    const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name, 'da'));
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(c => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM }}>
        <Text weight="semibold">{t('company.title')}</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
          <Spinner size="tiny" />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {t('company.loadingSuppliers')}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingHorizontalM }}>
      <Text weight="semibold">{t('company.title')}</Text>

      {/* Supplier combobox with search */}
      <Combobox
        value={query || company?.name || ''}
        selectedOptions={company ? [company.id] : []}
        onOptionSelect={(_, data) => {
          const selectedCompany = companies.find(c => c.id === data.optionValue) ?? null;
          setCompany(selectedCompany);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('company.searchPlaceholder')}
        style={{ width: '100%' }}
        freeform
      >
          {filteredCompanies.map(c => (
            <Option key={c.id} value={c.id} text={c.name}>
              <div>
                <div>{c.name}</div>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {t('company.productCount', { count: c.products.length })}
                </Text>
              </div>
            </Option>
          ))}
        </Combobox>

      {/* Product cards - only shown when company is selected */}
      {company && (
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
          {company.products.map(p => (
            <SelectionCard
              key={p.id}
              title={p.name}
              subtitle={`+${p.surcharge.toFixed(2)} kr/kWh · ${p.subscriptionMonthly} kr/md`}
              icon={p.isGreen ? (
                <LeafOne20Regular style={{ color: tokens.colorPaletteGreenForeground1 }} />
              ) : undefined}
              isSelected={product?.id === p.id}
              onClick={() => setProduct(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
