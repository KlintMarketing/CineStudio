
# Cine-Studio: Professional Video Prompting

A high-fidelity video generation tool leveraging Google's Gemini 2.5 and Veo 3.1 models.

## Security & API Keys

This project is designed to be shared safely. **No API keys are hardcoded in the source.**

### How to use your own key:
1. **Studio Integration**: When using the hosted version, click "Get Started" or the "Authorize" button. This opens the secure Google AI Studio key selector.
2. **Environment Variables**: For local development, create a `.env` file based on `template.env` and add your `API_KEY`.
3. **Billing**: Veo models require a paid Google Cloud Project. Ensure your project has billing enabled at [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing).

## Setup
```bash
npm install
npm run dev
```
