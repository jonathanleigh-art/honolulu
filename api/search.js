export default async function handler(req, res) {
  // 1. Pull data and force them into clean strings
  const ll = String(req.query.ll || '').replace(/\s/g, ''); // Removes any accidental spaces
  const radius = req.query.radius;
  const categories = req.query.categories;
  const price = req.query.price;
  const sort = req.query.sort;

  // 2. Build the core parameters
  const paramsObject = {
    ll: ll,
    radius: (radius && radius !== 'all') ? String(Math.round(parseFloat(radius))) : '10000',
    limit: '40', // Increased limit to give us more "room"
    fields: 'fsq_id,name,geocodes,location,categories,hours,rating,price,description',
    sort: sort === 'distance' ? 'DISTANCE' : 'RELEVANCE',
  };

  const searchParams = new URLSearchParams(paramsObject);

  // 3. ONLY add these if they have actual content
  if (categories && categories.length > 0) {
    searchParams.set('categories', categories);
  }
  
  if (price && price.length > 0) {
    searchParams.set('price', price);
  }

  const url = `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`;

  try {
    const fsqResponse = await fetch(url, {
      headers: {
        'Authorization': process.env.FOURSQUARE_API_KEY,
        'Accept': 'application/json',
        'v': '20231010'
      },
    });

    if (!fsqResponse.ok) {
      const errorText = await fsqResponse.text();
      return res.status(fsqResponse.status).json({ error: `FSQ Error: ${errorText}` });
    }

    const data = await fsqResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'The server bridge crashed' });
  }
}
