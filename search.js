export default async function handler(req, res) {
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

  // Only add optional params if they have real values
  if (categories && categories !== '') searchParams.set('categories', categories);
  if (price      && price      !== '') searchParams.set('price',      price);
  if (open_now   === 'true')           searchParams.set('open_now',   'true');

  const url = `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`;

  try {
    const fsqResponse = await fetch(url, {
      headers: {
        // Foursquare v3: raw API key only — no "Bearer" prefix
        'Authorization': process.env.FOURSQUARE_API_KEY,
        'Accept':        'application/json',
      },
    });

    if (!fsqResponse.ok) {
      const errorText = await fsqResponse.text();
      return res.status(fsqResponse.status).json({ error: `Foursquare error: ${errorText}` });
    }

    const data = await fsqResponse.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
