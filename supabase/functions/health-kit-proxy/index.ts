Deno.serve(async (req) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url') || 'https://app.insurancetoolkits.com/fex/quoter';
  
  // Forward the request to the target URL
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'User-Agent': req.headers.get('User-Agent') || 'Mozilla/5.0',
      'Accept': req.headers.get('Accept') || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': req.headers.get('Accept-Language') || 'en-US,en;q=0.5',
      'Cookie': req.headers.get('Cookie') || '',
      'Referer': 'https://app.insurancetoolkits.com/',
    },
    redirect: 'follow',
    body: req.body,
  });

  // Get response headers
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    // Filter out headers that might cause issues
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Handle cookies - pass them through
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Cookie');
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
});
