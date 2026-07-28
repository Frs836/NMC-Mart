const getEnv = (key: string): string => {
  const metaEnv = (import.meta as any)?.env?.[key];
  const procEnv = typeof process !== 'undefined' ? (process as any)?.env?.[key] : undefined;
  return metaEnv || procEnv || '';
};

export const ENV_CONFIG = {
  geminiApiKey: getEnv('GEMINI_API_KEY') || getEnv('VITE_GEMINI_API_KEY'),
  supabaseUrl: getEnv('VITE_SUPABASE_URL') || 'https://mauykmggmzmomllatfid.supabase.co',
  supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdXlrbWdnbXptb21sbGF0ZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTQ5MDMsImV4cCI6MjEwMDQ3MDkwM30.dzvYIHUNxdGELDoZT4NFqv89obeqGuM5_ozrhmdpoYk',
  databaseUrl: getEnv('DATABASE_URL'),
  appUrl: getEnv('APP_URL')
};

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(ENV_CONFIG.supabaseUrl) &&
    Boolean(ENV_CONFIG.supabaseAnonKey) &&
    !ENV_CONFIG.supabaseUrl.includes('your-supabase-project')
  );
};

