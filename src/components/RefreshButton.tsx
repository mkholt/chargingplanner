import { Button, Spinner, Text, tokens, Tooltip } from '@fluentui/react-components';
import { ArrowSync24Regular } from '@fluentui/react-icons';

type Props = {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: number;
};

export const RefreshButton: React.FC<Props> = ({ onRefresh, isRefreshing, lastUpdated }) => {
  const lastUpdatedText = lastUpdated
    ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`
    : 'Refresh prices';

  return (
    <Tooltip content={lastUpdatedText} relationship="label">
      <Button
        appearance="subtle"
        icon={isRefreshing ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh prices"
        style={{ minWidth: 'auto' }}
      >
        {lastUpdated && !isRefreshing && (
          <Text size={100} style={{ color: tokens.colorNeutralForeground3, marginLeft: 4 }}>
            {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </Button>
    </Tooltip>
  );
};
