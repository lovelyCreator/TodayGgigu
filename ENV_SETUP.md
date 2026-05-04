# Environment Variables Setup

This project uses `env.json` file for API configuration.

## Quick Start

1. **Copy the example file:**
```bash
cp env.json.example env.json
```

2. **Edit `env.json` with your API URLs:**
```json
{
  "API_BASE_URL": "https://todayGgigu.co.kr/api/v1",
  "SERVER_BASE_URL": "https://todayGgigu.co.kr"
}
```

3. **Rebuild the app:**
```bash
npm run android
# or
npm run ios
```

## File Location

- `env.json.example` - Template file (committed to git)
- `env.json` - Your actual config file (gitignored, don't commit this)

## Current Default Values

If `env.json` doesn't exist, the app will use these defaults:
- `API_BASE_URL`: `https://todayGgigu.co.kr/api/v1`
- `SERVER_BASE_URL`: `https://todayGgigu.co.kr`

## Troubleshooting

If the configuration isn't working:
1. Make sure `env.json` exists in the project root (same level as `package.json`)
2. Check that the JSON syntax is valid
3. Restart Metro bundler: `npm start -- --reset-cache`
4. Rebuild the app completely

