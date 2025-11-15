# Environment Variables Setup

## For Local Development

1. **Create a `.env` file in the root directory** (same level as `package.json`):

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenRouter Configuration (for AI Assistant)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

2. **Get your Supabase credentials**:
   - Go to your Supabase project dashboard: https://supabase.com/dashboard
   - Navigate to Settings > API
   - Copy the `Project URL` and `anon/public` key
   - Replace the values in your `.env` file

3. **Get your OpenRouter API key** (if using AI features):
   - Go to https://openrouter.ai/
   - Create an account and get your API key
   - Add it to your `.env` file

4. **Restart your dev server** after creating the `.env` file:
```bash
npm run dev
```

## For AWS Amplify Deployment

### Option 1: Using Amplify Console (Recommended)

1. **Go to your Amplify app** in AWS Console
2. **Navigate to**: App settings > Environment variables
3. **Add the following variables**:
   - `VITE_SUPABASE_URL` = your_supabase_project_url
   - `VITE_SUPABASE_ANON_KEY` = your_supabase_anon_key
   - `VITE_OPENROUTER_API_KEY` = your_openrouter_api_key

4. **Redeploy** your app for changes to take effect

### Option 2: Using AWS CLI

```bash
# Set environment variables
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --environment-variables \
    VITE_SUPABASE_URL=your_value \
    VITE_SUPABASE_ANON_KEY=your_value \
    VITE_OPENROUTER_API_KEY=your_value
```

## Important Notes

- ⚠️ **Never commit your `.env` file** to Git (it's already in `.gitignore`)
- ✅ The `amplify.yml` file is already configured to work with environment variables
- 🔒 Environment variables prefixed with `VITE_` are exposed to the browser (safe for public keys only)
- 🚀 Vite automatically loads environment variables from `.env` files during build

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env` file exists in the root directory
- Verify the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after creating/modifying `.env`

### Variables not working in Amplify
- Check that variables are set in Amplify Console
- Trigger a new deployment after adding variables
- Check build logs for any environment variable errors

