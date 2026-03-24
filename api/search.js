export default async function handler(req, res) {
  const { ll, radius, categories, price, sort } = req.query;

  if (!process.env.FOURSQUARE_API_KEY) {
    return res.status(500).json({ error: 'API Key missing in Vercel Settings' });
  }

  const searchParams = new URLSearchParams({
    ll: ll || '',
    radius: radius || '10000',
    limit: '25',
    fields: 'fsq_id,name,geocodes,location,categories,hours,rating,price,description',
    sort: sort === 'distance' ? 'DISTANCE' : 'RELEVANCE',
    v: '20260324' 
  });

  if (categories && categories !== "") searchParams.set('categories', categories);
  if (price && price !== "") searchParams.set('price', price);

  const url = `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`;

  try {
    const fsqResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.FOURSQUARE_API_KEY}`,
        'Accept': 'application/json',
        'v': '20260324'
      },
    });

    if (!fsqResponse.ok) {
      const errorText = await fsqResponse.text();
      return res.status(fsqResponse.status).json({ error: `Foursquare rejected us: ${errorText}` });
    }

    const data = await fsqResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: `Bridge Crash: ${error.message}` });
  }
}
