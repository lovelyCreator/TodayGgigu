import React from 'react';
import { StatusBar, Platform, LogBox } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { SocketProvider } from './src/context/SocketContext';
import { ErrorBoundary } from './src/components';
import NoteBroadcastManager from './src/components/NoteBroadcastManager';
import AppNavigator from './src/navigation/AppNavigator';
import { Provider } from 'react-redux';
import { store } from './src/store';

// Using system fonts - no custom font loading needed

// Disable console.error alerts in development mode
// This prevents React Native from showing Alert dialogs for console.error
// We handle errors with Toast notifications instead
if (__DEV__) {
  LogBox.ignoreAllLogs(false); // Keep logs visible in console
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Still log to console for debugging
    originalConsoleError(...args);
    // But don't trigger React Native's Alert dialog
  };
}

// Component that renders the main app content
const AppContent = () => {
  // Show StatusBar globally; make it translucent so each screen's header fills behind it
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setHidden(false);
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['bottom']}>
      <StatusBar
        hidden={false}
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <AppNavigator />
      <NoteBroadcastManager />
    </SafeAreaView>
  );
};

export default function App() {
  // Using system fonts - no custom fonts to load

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Provider store={store}>
            <ToastProvider>
              <AuthProvider>
                <SocketProvider>
                  <AppContent />
                </SocketProvider>
              </AuthProvider>
            </ToastProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
