import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ChatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Chat Error Boundary caught an error
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong with the chat</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = {
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  errorTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center' as const,
  },
  errorMessage: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    textAlign: 'center' as const,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: '600' as const,
  },
};

export default ChatErrorBoundary;
