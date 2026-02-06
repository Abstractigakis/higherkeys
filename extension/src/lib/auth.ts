import { supabase } from './supabase'

export async function signInWithGoogle() {
  if (typeof chrome === 'undefined' || !chrome.identity) {
    console.error('Chrome Identity API not available');
    return;
  }

  const url = new URL('https://dxiavqvplkxeftjkwzit.supabase.co/auth/v1/authorize')
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', chrome.identity.getRedirectURL())

  const authUrl = await chrome.identity.launchWebAuthFlow({
    url: url.toString(),
    interactive: true,
  })

  if (!authUrl) return

  const parsedUrl = new URL(authUrl)
  const accessToken = parsedUrl.hash.split('&').find(p => p.startsWith('#access_token='))?.split('=')[1]
  const refreshToken = parsedUrl.hash.split('&').find(p => p.startsWith('refresh_token='))?.split('=')[1]

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    return { data, error }
  }
}

export async function syncSessionWithWebsite() {
  console.log('--- syncSessionWithWebsite START ---');
  
  if (typeof chrome === 'undefined') {
    console.log('Chrome API not available (running in browser?)');
    return
  }

  if (!chrome.cookies) {
    console.log('chrome.cookies API NOT available. Check manifest permissions.');
    return
  }

  try {
    console.log('Fetching all cookies accessible to extension...');
    const cookies = await chrome.cookies.getAll({})
    console.log('Total cookies found:', cookies.length);
    
    if (cookies.length === 0) {
      console.log('No cookies found at all. This is suspicious.');
    }

    // Log all domains we can see to help debug
    const domains = [...new Set(cookies.map(c => c.domain))];
    console.log('Visible domains:', domains);

    // Look for ANY cookie that looks like a Supabase auth token
    const authCookies = cookies.filter(c => 
      c.name.includes('auth-token') || 
      c.name.startsWith('sb-')
    );
    
    console.log('Potential auth cookies found:', authCookies.map(c => ({
      name: c.name,
      domain: c.domain
    })));

    // Handle Chunked Cookies
    const baseNames = [...new Set(authCookies.map(c => c.name.replace(/\.\d+$/, '')))];
    console.log('Unique base cookie names found:', baseNames);

    // The project ID we expect
    const expectedProjectId = 'oofmixahptlnggmvomrp';
    
    // Find the base name that matches our project ID
    let preferredBaseName = baseNames.find(name => name.includes(expectedProjectId));
    
    if (preferredBaseName) {
      console.log('Found cookie matching project ID:', preferredBaseName);
    } else {
      console.log('No cookie found with project ID', expectedProjectId, '. Falling back to:', baseNames[0]);
      // If we are on higherkeys.com but the cookie is generic 'sb-auth-auth-token',
      // it might be because the site is using a custom domain or a different project.
      preferredBaseName = baseNames[0];
    }

    let sessionData = null;

    // Try the preferred one first
    const sortedBaseNames = baseNames.sort((a, b) => {
      if (a === preferredBaseName) return -1;
      if (b === preferredBaseName) return 1;
      return 0;
    });

    for (const baseName of sortedBaseNames) {
      // Get all chunks for this base name, sorted by index
      const chunks = authCookies
        .filter(c => c.name.startsWith(baseName))
        .sort((a, b) => {
          const aIdx = parseInt(a.name.split('.').pop() || '0');
          const bIdx = parseInt(b.name.split('.').pop() || '0');
          return aIdx - bIdx;
        });

      if (chunks.length === 0) continue;

      console.log(`Combining ${chunks.length} chunks for ${baseName}`);
      
      // Combine the values
      let fullRawValue = chunks.map(c => c.value).join('');
      
      // Remove surrounding quotes if present
      if (fullRawValue.startsWith('"') && fullRawValue.endsWith('"')) {
        fullRawValue = fullRawValue.slice(1, -1);
      }

      let decodedValue = '';
      
      if (fullRawValue.startsWith('base64-')) {
        console.log(`Decoding base64 for ${baseName}...`);
        try {
          let base64 = fullRawValue.substring(7)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          
          base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
          const pad = base64.length % 4;
          if (pad) base64 += '='.repeat(4 - pad);
          
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          decodedValue = new TextDecoder().decode(bytes);
        } catch (e: any) {
          console.error(`Decoding failed for ${baseName}:`, e.message);
          continue;
        }
      } else {
        decodedValue = decodeURIComponent(fullRawValue);
      }

      try {
        const parsed = JSON.parse(decodedValue);
        if (parsed.access_token && parsed.refresh_token) {
          // DIAGNOSTIC: Check the project ID in the token if possible
          try {
            const tokenParts = parsed.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log(`Token payload for ${baseName}:`, {
                aud: payload.aud,
                sub: payload.sub,
                email: payload.email,
                iss: payload.iss
              });
            }
          } catch (e) {}

          sessionData = parsed;
          console.log(`Successfully parsed session from ${baseName}`);
          break; // Found a valid session
        }
      } catch (e) {
        console.error(`JSON parse failed for ${baseName}`);
      }
    }

    if (sessionData) {
      console.log('Setting Supabase session...');
      const { data, error } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      })
      
      if (error) {
        console.error('Supabase setSession error:', error.message);
      } else {
        console.log('Supabase session synced! User:', data.user?.email);
        return { data, error };
      }
    } else {
      console.log('No valid session found in any cookies. Signing out of extension...');
      await supabase.auth.signOut();
    }
  } catch (e) {
    console.error('Unexpected error in syncSessionWithWebsite:', e)
  }
  console.log('--- syncSessionWithWebsite END ---');
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signOut() {
  await supabase.auth.signOut()
}
