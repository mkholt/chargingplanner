import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Spinner, Text, tokens } from '@fluentui/react-components';
import { ArrowSync20Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

type Props = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
};

const THRESHOLD = 50; // Pull distance needed to trigger refresh
const MAX_PULL = 70; // Maximum pull distance with tension

/**
 * Exponential tension function for natural spring-like resistance.
 * As the user pulls further, the resistance increases exponentially.
 * Higher k = less resistance (easier to pull).
 */
const applyTension = (x: number, max: number, k = 0.8): number =>
  max * (1 - Math.exp((-k * x) / max));

/**
 * Check if the page is scrolled to the top.
 * Works with both document-level scroll and scrollable containers.
 */
const isPageAtTop = (): boolean => {
  return window.scrollY === 0 && document.documentElement.scrollTop === 0;
};

export const PullToRefresh: React.FC<Props> = ({ children, onRefresh, disabled = false }) => {
  const { t } = useTranslation();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Use refs to avoid re-renders during touch movement
  const touchStartY = useRef(0);
  const wasAtTopOnStart = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only track touch if we're at the top of the page
    const atTop = isPageAtTop();
    wasAtTopOnStart.current = atTop;

    if (atTop) {
      touchStartY.current = e.touches[0].clientY;
      setIsReleased(false);
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !isPulling) return;

    setIsReleased(true);
    setIsPulling(false);

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      // Keep indicator visible during refresh
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    touchStartY.current = 0;
    wasAtTopOnStart.current = false;
  }, [disabled, isRefreshing, isPulling, pullDistance, onRefresh]);

  // Add non-passive touch event listener to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const touchMoveHandler = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      // If we didn't start at the top, allow normal scrolling
      if (!wasAtTopOnStart.current) return;

      // If we're not at the top anymore (user scrolled), stop tracking
      if (!isPageAtTop() && !isPulling) {
        touchStartY.current = 0;
        return;
      }

      if (touchStartY.current === 0) return;

      const currentY = e.touches[0]?.clientY ?? 0;
      const diff = currentY - touchStartY.current;

      // Only activate pull-to-refresh when pulling DOWN from the top
      if (diff > 0 && isPageAtTop()) {
        // Prevent default scroll behavior when pulling down at top
        e.preventDefault();
        setIsPulling(true);
        // Apply exponential tension for natural feel
        const distance = applyTension(diff, MAX_PULL);
        setPullDistance(distance);
      } else if (diff <= 0) {
        // User is scrolling up or hasn't moved - reset and allow normal scroll
        if (isPulling) {
          setPullDistance(0);
          setIsPulling(false);
        }
        // Don't prevent default - allow normal scrolling
      }
    };

    // Must use { passive: false } to allow preventDefault
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    return () => container.removeEventListener('touchmove', touchMoveHandler);
  }, [disabled, isRefreshing, isPulling]);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const shouldTrigger = pullDistance >= THRESHOLD;

  // Apply transition only after release, not during drag
  const transition = isReleased ? 'transform 0.3s ease-out' : 'none';

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: '100%',
        position: 'relative',
      }}
    >
      {/* Pull indicator - fixed position at top of viewport */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: THRESHOLD,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: showIndicator ? progress : 0,
          transition: isReleased ? 'opacity 0.3s ease-out' : 'none',
          background: tokens.colorNeutralBackground1,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacingHorizontalS,
          }}
        >
          {isRefreshing ? (
            <>
              <Spinner size="tiny" />
              <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
                {t('pullToRefresh.refreshing')}
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
                  transition: 'transform 0.1s ease-out, color 0.1s ease-out',
                }}
              />
              <Text
                size={200}
                style={{
                  color: shouldTrigger
                    ? tokens.colorBrandForeground1
                    : tokens.colorNeutralForeground3,
                  transition: 'color 0.1s ease-out',
                }}
              >
                {shouldTrigger ? t('pullToRefresh.release') : t('pullToRefresh.pull')}
              </Text>
            </>
          )}
        </div>
      </div>

      {/* Content - transformed down during pull */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition,
        }}
      >
        {children}
      </div>
    </div>
  );
};
