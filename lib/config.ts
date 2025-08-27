// Backend URL configuration
// Automatically determines the correct backend URL based on deployment environment

const getBackendUrl = (): string => {
  // Only check client-side overrides if we're in the browser
  if (typeof window !== 'undefined') {
    // Check for runtime override (from BackendSelector widget)
    if ((window as any).__OVERRIDE_API_URL) {
      return (window as any).__OVERRIDE_API_URL;
    }
    
    // Check localStorage for saved backend URL
    const savedUrl = localStorage.getItem('selectedBackendUrl');
    if (savedUrl) {
      return savedUrl;
    }
  }
  
  // Use explicitly set backend URL from environment variable
  if (process.env.NEXT_PUBLIC_GAP_INDEXER_URL) {
    return process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  }
  
  // Hardcoded defaults based on environment
  if (process.env.NEXT_PUBLIC_ENV === 'production') {
    return 'https://gapapi.karmahq.xyz';
  }
  
  if (process.env.NEXT_PUBLIC_ENV === 'staging') {
    return 'https://gapstagapi.karmahq.xyz';
  }
  
  // Default to local development
  return 'http://localhost:3001';
};

// Use a function to get the URL dynamically to avoid hydration issues
export const getAPIUrl = () => {
  return getBackendUrl();
};

// For backward compatibility
export const API_URL = getBackendUrl();

// Export for debugging
export const getEnvironmentInfo = () => {
  return {
    env: process.env.NEXT_PUBLIC_ENV,
    apiUrl: getAPIUrl(),
  };
};