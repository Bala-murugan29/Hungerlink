# Microsoft Translator Setup

## Overview
The application now uses Microsoft Translator API for better translation quality. This provides more accurate translations for Tamil and Hindi content.

## Setup Instructions

### 1. Get Microsoft Translator API Key
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a new resource or use existing subscription
3. Search for "Translator" and create a new Translator resource
4. Choose your preferred pricing tier (Free tier available with 2M characters/month)
5. After creation, go to "Keys and Endpoint" section
6. Copy one of the API keys

### 2. Configure Environment Variable
Add the following to your `.env` file:
```bash
VITE_MICROSOFT_TRANSLATOR_KEY=your-microsoft-translator-api-key-here
```

### 3. Fallback Behavior
- If Microsoft API key is not provided, the system falls back to MyMemory API
- Translation quality may be lower with fallback service
- Console logs will indicate which translation service is being used

## Supported Languages
- English (en)
- Tamil (ta) 
- Hindi (hi)

## Translation Features
- Automatic script detection for Tamil and Hindi
- Retry logic for better translation accuracy
- Caching to reduce API calls
- Console logging for debugging translation decisions

## Benefits over Previous System
- Higher translation quality
- Better handling of Tamil and Hindi scripts
- More reliable service availability
- Better error handling and fallbacks
