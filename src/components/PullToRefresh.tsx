import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

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
  const startScrollTop = useRef(0); // Track scroll position at touch start
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    startScrollTop.current = containerRef.current?.scrollTop ?? 0;
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
    startScrollTop.current = 0;
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  // Add non-passive touch event listener to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const touchMoveHandler = (e: TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      const currentScrollTop = container.scrollTop;

      // Only activate pull-to-refresh when:
      // 1. Started at the top (scrollTop was 0 at touch start)
      // 2. Currently at the top (scrollTop is 0)
      // 3. Pulling down (diff > 0)
      // 4. Already showing pull indicator (pullDistance > 0) OR just starting
      const isAtTop = startScrollTop.current === 0 && currentScrollTop === 0;

      if (isAtTop && diff > 0) {
        e.preventDefault();
        const distance = Math.min(diff / RESISTANCE, THRESHOLD * 1.5);
        setPullDistance(distance);
      }
    };

    // Must use { passive: false } to allow preventDefault
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    return () => container.removeEventListener('touchmove', touchMoveHandler);
  }, [disabled, isRefreshing]);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const indicatorHeight = isRefreshing ? 50 : pullDistance;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
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
              gap: tokens.spacingHorizontalS,
              opacity: isRefreshing ? 1 : progress,
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
                    transform: `rotate(${progress * 180}deg)`,
                    transition: 'transform 0.1s ease-out',
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
