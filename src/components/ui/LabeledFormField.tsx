import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

type Props = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
};

export const LabeledFormField: React.FC<Props> = ({ icon, label, children }) => {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <span style={{ color: tokens.colorNeutralForeground3, fontSize: 16, display: 'flex' }}>
          {icon}
        </span>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {label}
        </Text>
      </div>
      {children}
    </div>
  );
};
