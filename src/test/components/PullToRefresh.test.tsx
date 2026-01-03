import { render, screen } from '@testing-library/react';
import { FluentProvider, webDarkTheme } from '@fluentui/react-components';
import { PullToRefresh } from '@/components/PullToRefresh';

// Wrapper for Fluent UI components
const FluentWrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webDarkTheme}>
    {children}
  </FluentProvider>
);

describe('PullToRefresh', () => {
  const mockOnRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithFluent = (ui: React.ReactElement) => {
    return render(ui, { wrapper: FluentWrapper });
  };

  describe('rendering', () => {
    it('renders children', () => {
      renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="child-content">Test Content</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('child-content')).toBeTruthy();
      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('renders container with proper structure', () => {
      renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="content">Content</div>
        </PullToRefresh>
      );

      // Find the pull container by looking for the parent of content wrapper
      const contentElement = screen.getByTestId('content');
      // Content -> content wrapper -> pull container
      const pullContainer = contentElement.parentElement?.parentElement as HTMLElement;
      // Check the style attribute contains the expected values
      expect(pullContainer.getAttribute('style')).toContain('min-height: 100%');
      expect(pullContainer.getAttribute('style')).toContain('position: relative');
    });

    it('indicator starts with zero opacity', () => {
      const { container } = renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      const indicator = container.querySelector('[style*="position: fixed"]') as HTMLElement;
      expect(indicator.style.opacity).toBe('0');
    });

    it('content wrapper has transform style', () => {
      renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div data-testid="content">Content</div>
        </PullToRefresh>
      );

      // Find the content wrapper (div containing our test content with translateY transform)
      const contentElement = screen.getByTestId('content');
      const contentWrapper = contentElement.parentElement as HTMLElement;

      expect(contentWrapper.getAttribute('style')).toContain('translateY(0px)');
    });
  });

  describe('indicator text', () => {
    it('contains pull to update prices text in indicator', () => {
      renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh}>
          <div>Content</div>
        </PullToRefresh>
      );

      // The text exists in DOM but is hidden via opacity
      expect(screen.getByText('Pull to update prices')).toBeTruthy();
    });
  });

  describe('disabled prop', () => {
    it('renders when disabled', () => {
      renderWithFluent(
        <PullToRefresh onRefresh={mockOnRefresh} disabled>
          <div data-testid="content">Content</div>
        </PullToRefresh>
      );

      expect(screen.getByTestId('content')).toBeTruthy();
    });
  });

  // Note: Touch interaction tests are done via E2E tests (Playwright)
  // as JSDOM doesn't properly support native touch event listeners with { passive: false }
});
