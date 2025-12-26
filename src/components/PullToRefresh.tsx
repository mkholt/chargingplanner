import { useCallback, useRef, useState, type ReactNode } from 'react';

import { Spinner, Text, tokens } from '@fluentui/react-components';
import { ArrowSync20Regular } from '@fluentui/react-icons';

type Props = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
};

const THRESHOLD = 80; // Pull distance needed to trigger refresh
const RESISTANCE = 2.5; // Resistance factor for pull distance

export const PullToRefresh: React.FC<Props> = ({ children, onRefresh, disabled = false }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if we're at the top of the scroll container
  const isAtTop = () => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop()) return;
    startY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop() || startY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply resistance to make it feel natural
      const distance = Math.min(diff / RESISTANCE, THRESHOLD * 1.5);
      setPullDistance(distance);
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    startY.current = 0;
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const indicatorHeight = isRefreshing ? 50 : pullDistance;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      <div
        style={{
          height: indicatorHeight,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
          background: tokens.colorNeutralBackground1,
        }}
      >
        {showIndicator && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: isRefreshing ? 1 : progress,
              transform: `rotate(${progress * 180}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {isRefreshing ? (
              <>
                <Spinner size="tiny" />
                <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                  Refreshing...
                </Text>
              </>
            ) : (
              <>
                <ArrowSync20Regular
                  style={{
                    color: shouldTrigger
                      ? tokens.colorBrandForeground1
                      : tokens.colorNeutralForeground3,
                  }}
                />
                <Text
                  size={200}
                  style={{
                    color: shouldTrigger
                      ? tokens.colorBrandForeground1
                      : tokens.colorNeutralForeground3,
                  }}
                >
                  {shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
                </Text>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
