import React from 'react';

type Props = {
  horizontal?: boolean;
  gap?: number | string;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const Stack: React.FC<Props> = ({
  horizontal = false,
  gap,
  align,
  justify,
  wrap = false,
  style,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
