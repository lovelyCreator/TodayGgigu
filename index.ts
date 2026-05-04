import { AppRegistry } from 'react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import App from './App';

enableScreens(true);
enableFreeze(true);

// Register the main application component
// The app name should match the package name or be set in app.json
AppRegistry.registerComponent('todaymall', () => App);
