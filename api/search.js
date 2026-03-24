// CommonJS syntax — required for Vercel serverless functions
// without a package.json "type": "module" declaration
const https = require('https');

module.exports = async function handler(req, res) {
  // CORS headers so the browser can call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.FOURSQUARE_API_KEY) {
    return res.status(500).json({ error: 'FOURSQUARE_API_KEY missing in Vercel environment variables' });
  }

  const { ll, radius, categories, price, sort, open_now } = req.query;

  const searchParams = new URLSearchParams({
    ll:     ll     || '21.3069,-157.8583',
    radius: radius || '14000',
    limit:  '25',
    fields: 'fsq_id,name,geocodes,location,categories,hours,rating,price,description',
    sort:   sort === 'distance' ? 'DISTANCE' : 'RELEVANCE',
  });

  if (categories && categories !== '') searchParams.set('categories', categories);
  if (price      && price      !== '') searchParams.set('price',      price);
  if (open_now   === 'true')           searchParams.set('open_now',   'true');

  const url = `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`;

  try {
    // Use node-fetch polyfill approach — works on all Vercel Node runtimes
    const fsqResponse = await fetchWithNode(url, {
      'Authorization': process.env.FOURSQUARE_API_KEY,
      'Accept':        'application/json',
    });

    if (fsqResponse.status !== 200) {
      return res.status(fsqResponse.status).json({ error: `Foursquare error ${fsqResponse.status}: ${fsqResponse.body}` });
    }

    return res.status(200).json(JSON.parse(fsqResponse.body));

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
};

// Native Node https wrapper — no external packages needed, works on all runtimes
function fetchWithNode(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Foursquare request timed out'));
    });
  });
}
