const requiredPublicEnvironment = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  contentApiUrl: process.env.EXPO_PUBLIC_CONTENT_API_URL,
};

export function getPublicEnvironment() {
  return requiredPublicEnvironment;
}

export function validatePublicEnvironment() {
  const missing = Object.entries(requiredPublicEnvironment)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required public environment values: ${missing.join(', ')}`);
  }

  return missing;
}
