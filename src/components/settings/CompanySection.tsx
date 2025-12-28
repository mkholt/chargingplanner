import React, { useMemo, useState } from 'react';

import {
  Combobox,
  Option,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components';
import {
  Building20Regular,
  LeafOne20Regular,
} from '@fluentui/react-icons';

import { SelectionCard } from '@/components/settings';
import { usePriceSettings } from '@/contexts';
import { useCompaniesQuery } from '@/hooks';

export const CompanySection: React.FC = () => {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text weight="semibold">Electricity Supplier (Elselskab)</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner size="tiny" />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Loading suppliers...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Text weight="semibold">Electricity Supplier (Elselskab)</Text>

      {/* Supplier combobox with search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Building20Regular style={{ color: tokens.colorNeutralForeground2, flexShrink: 0 }} />
        <Combobox
          value={query || company?.name || ''}
          selectedOptions={company ? [company.id] : []}
          onOptionSelect={(_, data) => {
            const selectedCompany = companies.find(c => c.id === data.optionValue) ?? null;
            setCompany(selectedCompany);
            setQuery('');
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or select supplier"
          style={{ flex: 1 }}
          freeform
        >
          {filteredCompanies.map(c => (
            <Option key={c.id} value={c.id} text={c.name}>
              <div>
                <div>{c.name}</div>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {c.products.length} product{c.products.length !== 1 ? 's' : ''}
                </Text>
              </div>
            </Option>
          ))}
        </Combobox>
      </div>

      {/* Product cards - only shown when company is selected */}
      {company && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
