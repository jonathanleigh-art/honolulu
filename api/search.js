// Uses native fetch (Node 18+, available on all Vercel runtimes)
// CommonJS export required — no "type": "module" in package.json

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.FOURSQUARE_API_KEY) {
    return res.status(500).json({ error: 'FOURSQUARE_API_KEY missing in Vercel environment variables' });
  }

  const { ll, radius, categories, price, sort, open_now } = req.query;

  // Only pass parameters confirmed to work on the new places-api.foursquare.com endpoint.
  // NOTE: the "fields" selector is only valid on /places/{id}, NOT on /places/search.
  const searchParams = new URLSearchParams({
    ll:     ll     || '21.3069,-157.8583',
    radius: radius || '14000',
    limit:  '25',
    sort:   sort === 'distance' ? 'DISTANCE' : sort === 'rating' ? 'RATING' : 'RELEVANCE',
    // NOTE: the new places-api.foursquare.com does NOT support a "fields" param
    // on /places/search — only on /places/{id}. The API returns its default fields.
  });

  if (categories && categories !== '') searchParams.set('categories', categories);
  if (price      && price      !== '') searchParams.set('price',      price);
  if (open_now   === 'true')           searchParams.set('open_now',   'true');

  const url = `https://places-api.foursquare.com/places/search?${searchParams.toString()}`;

  // AbortController gives us a clean timeout that works with native fetch
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 9000);

  try {
    const fsqResponse = await fetch(url, {
      method:  'GET',
      headers: {
        'Authorization':       `Bearer ${process.env.FOURSQUARE_API_KEY}`,
        'Accept':              'application/json',
        'X-Places-Api-Version': '2025-02-05',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const body = await fsqResponse.text();

    if (!fsqResponse.ok) {
      return res.status(fsqResponse.status).json({
        error: `Foursquare error ${fsqResponse.status}: ${body}`,
      });
    }

    return res.status(200).json(JSON.parse(body));

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Foursquare request timed out after 9s' });
    }
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
};
