import React from 'react';

type Props = {
  horizontal?: boolean;
  gap?: number | string;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  'data-testid'?: string;
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
};

export const Stack: React.FC<Props> = ({
  horizontal = false,
  gap,
  align,
  justify,
  wrap = false,
  style,
  onClick,
  'data-testid': dataTestId,
  ref,
  children,
}) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      data-testid={dataTestId}
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
