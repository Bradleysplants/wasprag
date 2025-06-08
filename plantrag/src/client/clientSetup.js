// src/client/clientSetup.js
// Single Cloudflare tunnel - no CORS issues!
// CLIENT-SIDE CODE ONLY

export const clientSetup = () => {
  console.log('🔧 Client setup starting...');
  
  if (window.location.hostname.includes('trycloudflare.com') || 
      window.location.hostname.includes('cloudflare.com')) {
    console.log('☁️ Detected Cloudflare tunnel environment');
    console.log('📍 Single tunnel URL:', window.location.origin);
    console.log('✅ No CORS configuration needed - same domain!');
    console.log('🚀 All API calls will go through the same domain');
    
    // No redirects needed! Wasp's built-in proxy handles everything
    // Frontend: https://tunnel.trycloudflare.com
    // API calls: https://tunnel.trycloudflare.com/operations/... (same domain = no CORS!)
    
    console.log('📋 Single tunnel benefits:');
    console.log('  - No CORS issues (same domain)');
    console.log('  - Faster (no redirects)');
    console.log('  - Simpler configuration');
    console.log('  - More reliable');
    
  } else {
    console.log('📍 Running on localhost, using default configuration');
  }
};