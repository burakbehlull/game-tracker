/**
 * Helper to resolve asset URLs.
 * If VITE_IMAGE_BASE_URL is provided in .env, it prepends it to the path.
 * Otherwise, it ensures the path is relative for Electron compatibility.
 * 
 * @param {string} path - The asset path (e.g., 'assets/games/valorant_banner.jpg')
 * @returns {string} - The resolved URL
 */
export const getAssetUrl = (path) => {
  if (!path) return '';
  
  // Remove leading slash if it exists to keep paths relative by default
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  
  const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  
  if (baseUrl) {
    // Ensure baseUrl ends with a slash and normalizedPath doesn't start with one
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${cleanBaseUrl}${normalizedPath}`;
  }
  
  // Default to relative path for Electron/Local build
  return `./${normalizedPath}`;
};
