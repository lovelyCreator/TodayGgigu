@echo off
echo Setting up ADB reverse port forwarding...
adb reverse tcp:8081 tcp:8081
echo.
echo Starting Metro Bundler...
echo.
echo Make sure to keep this window open!
echo Metro will be available at http://localhost:8081
echo.
react-native start --reset-cache
pause

