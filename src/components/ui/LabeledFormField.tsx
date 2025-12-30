import React from 'react';

import { Text, tokens } from '@fluentui/react-components';

type Props = {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
};

export const LabeledFormField: React.FC<Props> = ({ icon, label, children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 4,
        marginBottom: 4,
        minHeight: 40,
      }}>
        <span style={{
          color: tokens.colorNeutralForeground3,
          fontSize: 16,
          display: 'flex',
          flexShrink: 0,
          marginTop: 2,
        }}>
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
