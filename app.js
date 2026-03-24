/* ============================================================
   WHAT WE DOING RN? — app.js
   Modes:
     • Foursquare  — live Places API (free tier, 1k calls/day)
     • Curated     — 20 hand-picked Honolulu spots, no key needed
   Features:
     • Geolocation — real distances, radius filter, sort by distance
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const state = {
    apiKey:  localStorage.getItem('wwdrn_fsq_key') || '',
    mode:    'foursquare',
    userLat: null,
    userLng: null,
    filters: {
        time:     'all',
        budget:   'all',
        group:    'all',
        category: 'all',
        radius:   'all',
        sort:     'rating',
    },
};

// ─── FOURSQUARE CATEGORY IDs ──────────────────────────────────
// https://docs.foursquare.com/data-products/docs/places-categories
const FSQ_CATEGORIES = {
    outdoor:   '16000',          // Outdoors & Recreation
    food:      '13000',          // Dining and Drinking
    arts:      '10000',          // Arts & Entertainment
    nightlife: '10032,13003',    // Nightlife Spot + Bar
    shopping:  '17000',          // Retail
    all:       '',               // No category filter — return everything
};

// Foursquare price: 1($) 2($$) 3($$$) 4($$$$)
// Our UI: 0=Free  1=$  2=$$  3=$$$
const BUDGET_TO_FSQ_PRICE = {
    all: '',
    '0': '',   // "Free" — parks/beaches have no price field; filter in post-processing
    '1': '1',
    '2': '2',
    '3': '3,4',
};

// Neighborhood centers (lat, lng) + search radius in meters
const NEIGHBORHOODS = {
    all:       { lat: 21.3069, lng: -157.8583, radius: 14000 },
    waikiki:   { lat: 21.2793, lng: -157.8300, radius: 2000  },
    downtown:  { lat: 21.3065, lng: -157.8568, radius: 1500  },
    chinatown: { lat: 21.3103, lng: -157.8628, radius: 900   },
    kaimuki:   { lat: 21.2817, lng: -157.7994, radius: 1400  },
    kakaako:   { lat: 21.2967, lng: -157.8583, radius: 1400  },
    manoa:     { lat: 21.3132, lng: -157.8023, radius: 1800  },
    nuuanu:    { lat: 21.3289, lng: -157.8370, radius: 1500  },
    eastside:  { lat: 21.2936, lng: -157.7360, radius: 3500  },
};

// ─── CURATED HONOLULU DATA (real coordinates) ─────────────────
const CURATED = [
    {
        id:'c1', name:'Hanauma Bay Nature Preserve',
        category:'outdoor', emoji:'🐠',
        lat:21.2688, lng:-157.6940,
        rating:4.7, priceLevel:1,
        address:'100 Hanauma Bay Rd',
        description:'Iconic snorkeling bay inside a volcanic crater. Sea turtles, tropical fish, vibrant coral. Book online — entry is limited daily.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Arrive before 7 AM or you may not get in. Closed Tuesdays. Reservation required online.',
        mapsUrl:'https://maps.google.com/?q=Hanauma+Bay+Nature+Preserve+Honolulu',
        openNow: true,
    },
    {
        id:'c2', name:'Diamond Head State Monument',
        category:'outdoor', emoji:'🏔️',
        lat:21.2587, lng:-157.8054,
        rating:4.6, priceLevel:1,
        address:'Diamond Head Rd',
        description:'Hike inside the rim of Honoluluʻs iconic volcanic tuff cone. 1.6 miles round-trip, sweeping 360° views of Waikiki and the Pacific.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Reserve online. Go early to beat heat. Bring water and sunscreen.',
        mapsUrl:'https://maps.google.com/?q=Diamond+Head+State+Monument',
        openNow: true,
    },
    {
        id:'c3', name:'Waikiki Beach',
        category:'outdoor', emoji:'🏄',
        lat:21.2768, lng:-157.8299,
        rating:4.5, priceLevel:0,
        address:'Waikiki Beach, Kalakaua Ave',
        description:'The world-famous crescent of golden sand. Swim, surf, outrigger canoe, or catch one of the best sunsets in the Pacific.',
        times:['morning','afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:'Surf lessons available for beginners at the east end. Sunsets near the Hilton lagoon are stunning.',
        mapsUrl:'https://maps.google.com/?q=Waikiki+Beach+Honolulu',
        openNow: true,
    },
    {
        id:'c4', name:'Bishop Museum',
        category:'arts', emoji:'🏛️',
        lat:21.3163, lng:-157.8692,
        rating:4.5, priceLevel:2,
        address:"1525 Bernice St",
        description:"Hawaiʻi's premier natural history & cultural museum. World-class Hawaiian artifacts, royal regalia, and an immersive Science Adventure Center.",
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Allow 2–3 hours. Planetarium shows are excellent. Café on-site.',
        mapsUrl:'https://maps.google.com/?q=Bishop+Museum+Honolulu',
        openNow: true,
    },
    {
        id:'c5', name:'Iolani Palace',
        category:'arts', emoji:'👑',
        lat:21.3069, lng:-157.8601,
        rating:4.6, priceLevel:2,
        address:'364 S King St',
        description:"The only royal palace on US soil. Home to King Kalākaua and Queen Liliʻuokalani. Guided and audio tours available.",
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Book tickets in advance. Closed Sunday & Monday.',
        mapsUrl:'https://maps.google.com/?q=Iolani+Palace+Honolulu',
        openNow: false,
    },
    {
        id:'c6', name:'Honolulu Museum of Art',
        category:'arts', emoji:'🎨',
        lat:21.3049, lng:-157.8611,
        rating:4.6, priceLevel:2,
        address:'900 S Beretania St',
        description:'Stunning 1927 campus with 50,000+ works spanning Asian, European, American, and Pacific art. Beautiful courtyards.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'First Wednesday of each month is free admission. The café is excellent for lunch.',
        mapsUrl:'https://maps.google.com/?q=Honolulu+Museum+of+Art',
        openNow: true,
    },
    {
        id:'c7', name:"Leonard's Bakery",
        category:'food', emoji:'🍩',
        lat:21.2837, lng:-157.8207,
        rating:4.7, priceLevel:1,
        address:'933 Kapahulu Ave',
        description:"The original malasada spot since 1952. Fresh Portuguese donuts in sugar, stuffed with custard, haupia, or dobash. A Honolulu institution.",
        times:['morning','afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:'Get there early — lines form fast. Eat hot malasadas immediately. Try the poi flavor.',
        mapsUrl:"https://maps.google.com/?q=Leonard's+Bakery+Honolulu",
        openNow: true,
    },
    {
        id:'c8', name:'Rainbow Drive-In',
        category:'food', emoji:'🍱',
        lat:21.2823, lng:-157.8018,
        rating:4.5, priceLevel:1,
        address:'3308 Kanaina Ave',
        description:'Legendary local plate lunch joint since 1961. Mixed plate with two scoops of rice, mac salad, teriyaki beef or loco moco. Cash only.',
        times:['morning','afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:'Cash only — ATM on site. Get the mixed plate. Lines peak 11am–1pm.',
        mapsUrl:'https://maps.google.com/?q=Rainbow+Drive-In+Honolulu',
        openNow: true,
    },
    {
        id:'c9', name:"The Pig & The Lady",
        category:'food', emoji:'🍜',
        lat:21.3106, lng:-157.8641,
        rating:4.6, priceLevel:2,
        address:'83 N King St, Chinatown',
        description:'Acclaimed farm-to-table Vietnamese fusion in Chinatown. Creative takes on pho, bánh mì, and wood-fired dishes.',
        times:['afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:'Reservations strongly recommended for dinner. The pho is a must.',
        mapsUrl:'https://maps.google.com/?q=The+Pig+and+The+Lady+Honolulu',
        openNow: false,
    },
    {
        id:'c10', name:"Duke's Waikiki",
        category:'food', emoji:'🌅',
        lat:21.2765, lng:-157.8291,
        rating:4.4, priceLevel:3,
        address:'2335 Kalakaua Ave',
        description:'Iconic beachfront bar & restaurant honoring Duke Kahanamoku. Live Hawaiian music most evenings. Sunset views are unreal.',
        times:['afternoon','evening','night'], groupSizes:['solo','couple','small'],
        tips:'Go at golden hour. Sit on the lower open-air deck. Hula Pie is non-negotiable.',
        mapsUrl:"https://maps.google.com/?q=Duke's+Waikiki",
        openNow: true,
    },
    {
        id:'c11', name:"Nuʻuanu Pali Lookout",
        category:'outdoor', emoji:'💨',
        lat:21.3636, lng:-157.7994,
        rating:4.7, priceLevel:0,
        address:'Nuuanu Pali Dr',
        description:'Jaw-dropping clifftop viewpoint 1,200 feet above the windward coast. Trade winds can hit 60 mph. Historic battle site.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Hold onto your hat — literally. Combine with a drive to the windward side.',
        mapsUrl:"https://maps.google.com/?q=Nu'uanu+Pali+Lookout",
        openNow: true,
    },
    {
        id:'c12', name:'Koko Head Crater Trail',
        category:'outdoor', emoji:'🧗',
        lat:21.2824, lng:-157.7018,
        rating:4.5, priceLevel:0,
        address:'Koko Head District Park',
        description:'Climb 1,048 old railway ties to the top of an extinct volcanic crater. Intense but rewarding panoramic views.',
        times:['morning'], groupSizes:['solo','couple','small'],
        tips:'Go before 8 AM to beat heat. Bring plenty of water.',
        mapsUrl:'https://maps.google.com/?q=Koko+Head+Crater+Trail+Honolulu',
        openNow: true,
    },
    {
        id:'c13', name:'Chinatown Food Walk',
        category:'food', emoji:'🥟',
        lat:21.3103, lng:-157.8628,
        rating:4.5, priceLevel:1,
        address:'N Hotel St & River St',
        description:"Self-guided stroll through one of America's oldest Chinatowns. Dim sum, bánh mì, fresh leis, art galleries, fish markets.",
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Best on weekday mornings. Try To Chau for pho, Maunakea Marketplace for variety.',
        mapsUrl:'https://maps.google.com/?q=Chinatown+Honolulu',
        openNow: true,
    },
    {
        id:'c14', name:'Ala Moana Beach Park',
        category:'outdoor', emoji:'🏖️',
        lat:21.2908, lng:-157.8461,
        rating:4.6, priceLevel:0,
        address:'1201 Ala Moana Blvd',
        description:"Honolulu's biggest beach park with calm protected waters. Perfect for swimming, paddleboarding, and spectacular sunsets.",
        times:['morning','afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:'Weekend evenings have free hula shows at the Ala Moana Center stage nearby.',
        mapsUrl:'https://maps.google.com/?q=Ala+Moana+Beach+Park+Honolulu',
        openNow: true,
    },
    {
        id:'c15', name:'SALT at Our Kakaʻako',
        category:'shopping', emoji:'🛍️',
        lat:21.2965, lng:-157.8586,
        rating:4.4, priceLevel:2,
        address:'685 Auahi St',
        description:'Hip outdoor shopping & dining in the artsy Kakaʻako district. Local boutiques, street murals, restaurants, and weekend pop-ups.',
        times:['afternoon','evening','night'], groupSizes:['solo','couple','small'],
        tips:'Night Market is every third Friday. Street art in the surrounding blocks is world-class.',
        mapsUrl:'https://maps.google.com/?q=SALT+at+Our+Kakaako+Honolulu',
        openNow: true,
    },
    {
        id:'c16', name:'Liliha Bakery',
        category:'food', emoji:'🎂',
        lat:21.3167, lng:-157.8671,
        rating:4.7, priceLevel:1,
        address:'515 N Kuakini St',
        description:'Old-school Honolulu diner and bakery since 1950. Famous for coco puffs, pancake breakfasts, and plate lunches.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Coco puffs sell out fast — go early. The breakfast counter is a true Honolulu experience.',
        mapsUrl:'https://maps.google.com/?q=Liliha+Bakery+Honolulu',
        openNow: true,
    },
    {
        id:'c17', name:'Lost + Found Bar',
        category:'nightlife', emoji:'🍹',
        lat:21.3094, lng:-157.8639,
        rating:4.5, priceLevel:3,
        address:'115 N Hotel St, Chinatown',
        description:"Honolulu's best craft cocktail bar in a Chinatown alley. Creative tropical drinks with local ingredients. Dark, intimate atmosphere.",
        times:['evening','night'], groupSizes:['solo','couple','small'],
        tips:'No reservations. Arrive by 8 PM or wait. Let the bartender choose for you.',
        mapsUrl:'https://maps.google.com/?q=Lost+Found+Bar+Honolulu',
        openNow: false,
    },
    {
        id:'c18', name:"Makapuʻu Point Lighthouse Trail",
        category:'outdoor', emoji:'🦅',
        lat:21.3124, lng:-157.6514,
        rating:4.6, priceLevel:0,
        address:'Kalanianaole Hwy, Waimanalo',
        description:'Paved 2-mile coastal trail with dramatic sea cliffs. In winter, watch for humpback whales. Sea turtles on the beach below.',
        times:['morning','afternoon'], groupSizes:['solo','couple','small'],
        tips:'Accessible paved trail — good for all fitness levels. Go early; parking fills fast.',
        mapsUrl:"https://maps.google.com/?q=Makapu'u+Point+Lighthouse+Trail",
        openNow: true,
    },
    {
        id:'c19', name:'Tantalus & Round Top Drive',
        category:'outdoor', emoji:'🌿',
        lat:21.3056, lng:-157.8239,
        rating:4.6, priceLevel:0,
        address:'Round Top Dr',
        description:'Scenic mountain drive through lush rainforest above Honolulu. Multiple overlooks with sweeping city and ocean views.',
        times:['morning','afternoon','evening'], groupSizes:['solo','couple','small'],
        tips:"Puʻu ʻUalakaʻa State Wayside has the best panoramic view. Bring bug spray.",
        mapsUrl:'https://maps.google.com/?q=Round+Top+Drive+Honolulu',
        openNow: true,
    },
    {
        id:'c20', name:'Ong King Arts Center',
        category:'nightlife', emoji:'🎸',
        lat:21.3106, lng:-157.8641,
        rating:4.4, priceLevel:1,
        address:'184 N King St, Chinatown',
        description:"Intimate Chinatown venue with live music, comedy, and art shows. The heartbeat of Honolulu's underground arts and music scene.",
        times:['evening','night'], groupSizes:['solo','couple','small'],
        tips:'Check calendar online for shows. Cover charge varies. Cash preferred.',
        mapsUrl:'https://maps.google.com/?q=Ong+King+Arts+Center+Honolulu',
        openNow: false,
    },
];

// ─── FOURSQUARE CATEGORY → EMOJI ─────────────────────────────
const CATEGORY_EMOJI_MAP = [
    { keywords: ['beach','bay','surf'],                  emoji: '🏖️' },
    { keywords: ['hiking','trail','mountain','crater'],  emoji: '🧗' },
    { keywords: ['park','garden','nature'],              emoji: '🌿' },
    { keywords: ['museum','gallery','art'],              emoji: '🎨' },
    { keywords: ['palace','historic','monument'],        emoji: '🏛️' },
    { keywords: ['bakery','pastry','donut'],             emoji: '🍩' },
    { keywords: ['bar','cocktail','nightlife','club'],   emoji: '🍹' },
    { keywords: ['restaurant','dining','food','cafe'],   emoji: '🍽️' },
    { keywords: ['coffee','tea'],                        emoji: '☕' },
    { keywords: ['shopping','mall','boutique','store'],  emoji: '🛍️' },
    { keywords: ['music','live','concert'],              emoji: '🎶' },
    { keywords: ['lookout','viewpoint','overlook'],      emoji: '👁️' },
];

function guessEmoji(name, categoryName) {
    const text = (name + ' ' + (categoryName || '')).toLowerCase();
    for (const { keywords, emoji } of CATEGORY_EMOJI_MAP) {
        if (keywords.some(k => text.includes(k))) return emoji;
    }
    return '📍';
}

// ─── NORMALIZE FOURSQUARE RESULT → our format ────────────────
function normalizeFSQPlace(place) {
    const cat = place.categories?.[0] || {};
    const catName = cat.name || '';
    const catId   = String(cat.id || '');

    // Map FSQ category → our category
    let category = 'outdoor';
    if      (catId.startsWith('13')) category = 'food';
    else if (catId.startsWith('10')) category = catId === '10032' ? 'nightlife' : 'arts';
    else if (catId.startsWith('17')) category = 'shopping';
    else if (catId.startsWith('16')) category = 'outdoor';

    const lat = place.geocodes?.main?.latitude;
    const lng = place.geocodes?.main?.longitude;

    // FSQ rating is 0–10; normalize to 0–5
    const rawRating = place.rating;
    const rating    = rawRating ? parseFloat((rawRating / 2).toFixed(1)) : null;

    // FSQ price: 1–4; map to our 1–3 scale
    const fsqPrice = place.price;
    const priceLevel = fsqPrice === undefined || fsqPrice === null
        ? 0
        : fsqPrice <= 1 ? 1 : fsqPrice === 2 ? 2 : 3;

    const openNow = place.hours?.open_now;

    const addressParts = [
        place.location?.address,
        place.location?.neighborhood?.[0],
    ].filter(Boolean);
    const address = addressParts.join(', ') || place.location?.formatted_address || '';

    return {
        id:          place.fsq_id,
        name:        place.name,
        category,
        emoji:       guessEmoji(place.name, catName),
        lat, lng,
        rating:      rating || 4.0,
        priceLevel,
        address,
        description: place.description || `${catName} in Honolulu`,
        times:       inferTimes(category, catName),
        groupSizes:  ['solo', 'couple', 'small'],
        openNow,
        mapsUrl:     lat && lng
            ? `https://maps.google.com/?q=${lat},${lng}`
            : `https://maps.google.com/?q=${encodeURIComponent(place.name + ' Honolulu Hawaii')}`,
    };
}

function inferTimes(category, catName) {
    const name = catName.toLowerCase();
    if (category === 'nightlife')                         return ['evening', 'night'];
    if (name.includes('breakfast') || name.includes('brunch')) return ['morning'];
    if (name.includes('bakery') || name.includes('coffee'))    return ['morning', 'afternoon'];
    if (category === 'food')                              return ['morning', 'afternoon', 'evening'];
    if (category === 'outdoor')                           return ['morning', 'afternoon'];
    if (category === 'arts')                              return ['morning', 'afternoon'];
    if (category === 'shopping')                          return ['afternoon', 'evening'];
    return ['morning', 'afternoon', 'evening'];
}

// ─── GEO HELPERS ─────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R    = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat/2)**2
               + Math.cos(lat1 * Math.PI/180)
               * Math.cos(lat2 * Math.PI/180)
               * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(miles) {
    if (miles < 0.15) return 'Right here';
    if (miles < 1)    return (miles * 5280).toFixed(0) + ' ft away';
    return miles.toFixed(1) + ' mi away';
}

function attachDistances(activities) {
    if (state.userLat === null) return activities;
    return activities.map(a => ({
        ...a,
        distance: (a.lat && a.lng)
            ? haversineDistance(state.userLat, state.userLng, a.lat, a.lng)
            : null,
    }));
}

// ─── DISPLAY HELPERS ─────────────────────────────────────────
function starsHtml(rating) {
    const clamped = Math.max(0, Math.min(5, rating || 0));
    const full    = Math.floor(clamped);
    const half    = clamped % 1 >= 0.5;
    const empty   = 5 - full - (half ? 1 : 0);
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function priceHtml(level) {
    if (!level) return '<span class="price">Free</span>';
    return '<span class="price">' + '$'.repeat(Math.min(level, 3)) + '</span>';
}

function priceLabelText(level) {
    return ({0:'Free', 1:'$ Inexpensive', 2:'$$ Moderate', 3:'$$$ Pricey'})[level] || '';
}

function categoryLabel(cat) {
    return ({
        outdoor:   '🌿 Outdoor',
        food:      '🍜 Food & Drink',
        arts:      '🎨 Arts & Culture',
        nightlife: '🎶 Nightlife',
        shopping:  '🛍 Shopping',
    })[cat] || cat;
}

function timeLabel(t) {
    return ({morning:'🌅 Morning', afternoon:'☀️ Afternoon', evening:'🌇 Evening', night:'🌙 Night'})[t] || t;
}

// ─── CARD RENDERING ──────────────────────────────────────────
function renderCard(activity, isLive = false) {
    const card = document.createElement('div');
    card.className = 'card';

    const distText = activity.distance != null
        ? `<span class="distance-badge">📍 ${formatDistance(activity.distance)}</span>`
        : '';

    const openBadge = activity.openNow === true
        ? '<span class="open-badge">Open now</span>'
        : activity.openNow === false
            ? '<span class="open-badge unknown">Check hours</span>'
            : '';

    const liveBadge = isLive ? '<span class="live-badge">🟠 Live</span>' : '';

    card.innerHTML = `
        <div class="card-image">${activity.emoji || '📍'}</div>
        <div class="card-body">
            <div class="card-tags">
                <span class="tag ${activity.category}">${categoryLabel(activity.category)}</span>
                ${liveBadge}
            </div>
            <div class="card-name">${activity.name}</div>
            <div class="card-meta">
                <span class="stars">${starsHtml(activity.rating)}</span>
                <span>${(activity.rating || 4.0).toFixed(1)}</span>
                ${priceHtml(activity.priceLevel)}
            </div>
            <p class="card-desc">${activity.description}</p>
            <div class="card-footer">
                ${distText || '<span></span>'}
                ${openBadge}
            </div>
        </div>
    `;
    card.addEventListener('click', () => showDetail(activity, isLive));
    return card;
}

// ─── DETAIL MODAL ────────────────────────────────────────────
function showDetail(activity, isLive) {
    const timesHtml = (activity.times || [])
        .map(t => `<span class="time-chip">${timeLabel(t)}</span>`).join('');
    const distText  = activity.distance != null
        ? `<span>📍 ${formatDistance(activity.distance)}</span>` : '';

    document.getElementById('detail-body').innerHTML = `
        <div class="detail-hero">${activity.emoji || '📍'}</div>
        <div class="detail-content">
            <div class="card-tags" style="margin-bottom:10px;gap:6px;display:flex;flex-wrap:wrap">
                <span class="tag ${activity.category}">${categoryLabel(activity.category)}</span>
                ${isLive ? '<span class="live-badge">🟠 Live from Foursquare</span>' : ''}
                ${activity.openNow === true ? '<span class="open-badge">Open now</span>' : ''}
                ${activity.openNow === false ? '<span class="open-badge unknown">Check hours</span>' : ''}
            </div>
            <h2>${activity.name}</h2>
            <div class="detail-meta">
                <span class="stars">${starsHtml(activity.rating)}</span>
                <span><strong>${(activity.rating || 4.0).toFixed(1)}</strong></span>
                <span>${priceLabelText(activity.priceLevel)}</span>
                ${distText}
            </div>
            <div class="detail-section">
                <h4>About</h4>
                <p>${activity.description}</p>
            </div>
            ${activity.tips ? `
            <div class="detail-section">
                <h4>💡 Local Tips</h4>
                <p>${activity.tips}</p>
            </div>` : ''}
            ${timesHtml ? `
            <div class="detail-section">
                <h4>Best Times</h4>
                <div class="detail-times">${timesHtml}</div>
            </div>` : ''}
            ${activity.address ? `
            <div class="detail-section">
                <h4>Address</h4>
                <p>${activity.address}</p>
            </div>` : ''}
            <a href="${activity.mapsUrl}" target="_blank" rel="noopener" class="map-link">🗺️ Open in Google Maps</a>
        </div>
    `;
    document.getElementById('detail-modal').classList.remove('hidden');
}

// ─── FOURSQUARE LIVE SEARCH ───────────────────────────────────
async function runFoursquareSearch() {
    const { budget, category, radius, sort } = state.filters;

    let searchLat, searchLng, searchRadius;
    if (state.userLat !== null) {
        searchLat = state.userLat;
        searchLng = state.userLng;
        searchRadius = radius !== 'all' ? Math.round(parseFloat(radius) * 1609.34) : 10000;
    } else {
        const hood = NEIGHBORHOODS.all;
        searchLat = hood.lat;
        searchLng = hood.lng;
        searchRadius = hood.radius;
    }

const params = new URLSearchParams({
        ll: `${searchLat},${searchLng}`, 
        radius: String(searchRadius),
        categories: FSQ_CATEGORIES[category] || '',
        price: BUDGET_TO_FSQ_PRICE[budget] || '',
        sort: sort
    });

    const response = await fetch(`/api/search?${params.toString()}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Foursquare connection failed');
    }

    const data = await response.json();
    let results = (data.results || []).map(normalizeFSQPlace);

    if (budget === '0') results = results.filter(a => a.priceLevel === 0);
    results = attachDistances(results);

    return results;
}
}
}

// ─── FILTER CURATED LIST ─────────────────────────────────────
function filterCurated() {
    const { time, budget, group, category, radius, sort } = state.filters;
    let list = attachDistances([...CURATED]);

    list = list.filter(a => {
        if (time     !== 'all' && !(a.times      || []).includes(time))   return false;
        if (group    !== 'all' && !(a.groupSizes || []).includes(group))  return false;
        if (category !== 'all' &&  a.category !== category)               return false;
        if (budget !== 'all') {
            const b = parseInt(budget);
            if (b === 0 && a.priceLevel !== 0)                            return false;
            if (b === 1 && a.priceLevel !== 1)                            return false;
            if (b === 2 && a.priceLevel !== 2)                            return false;
            if (b === 3 && (a.priceLevel == null || a.priceLevel < 3))    return false;
        }
        if (radius !== 'all' && a.distance != null
            && a.distance > parseFloat(radius))                           return false;
        return true;
    });

    list.sort((a, b) => {
        if (sort === 'distance' && a.distance != null && b.distance != null)
            return a.distance - b.distance;
        return (b.rating || 0) - (a.rating || 0);
    });

    return list;
}

// ─── RENDER RESULTS ──────────────────────────────────────────
function renderResults(activities, isLive = false) {
    const grid   = document.getElementById('results-grid');
    const header = document.getElementById('results-header');
    grid.innerHTML = '';

    if (!activities.length) {
        header.innerHTML = `<h2>Nothing matched 🤔</h2><p>Try broadening your filters.</p>`;
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">🔭</div>
                <p class="empty-title">No activities found</p>
                <p class="empty-hint">Try loosening the filters — maybe drop the budget or time.</p>
            </div>`;
        return;
    }

    const modeLabel  = isLive ? '🟠 Live from Foursquare' : '⭐ Curated picks';
    const sortNote   = state.filters.sort === 'distance' && state.userLat
        ? ' · sorted by distance' : ' · sorted by rating';
    const openNote   = state.filters.time !== 'all' && isLive
        ? ' · open now' : '';

    header.innerHTML = `
        <h2>Found ${activities.length} thing${activities.length === 1 ? '' : 's'} to do</h2>
        <p>${modeLabel}${openNote}${sortNote}</p>`;

    activities.forEach(a => grid.appendChild(renderCard(a, isLive)));
}

// ─── LOADING STATE ────────────────────────────────────────────
function showLoading(text = 'Finding the move…') {
    document.getElementById('results-grid').classList.add('hidden');
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() {
    document.getElementById('results-grid').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
}
function showError(msg) {
    hideLoading();
    document.getElementById('results-header').innerHTML =
        `<h2>Something went wrong 😬</h2><p>${msg}</p>`;
    document.getElementById('results-grid').innerHTML = `
        <div class="empty-state">
            <div class="empty-emoji">⚡</div>
            <p class="empty-title">Couldn't get results</p>
            <p class="empty-hint">${msg}</p>
        </div>`;
}

// ─── MAIN SEARCH HANDLER ─────────────────────────────────────
async function handleSearch() {
    if (state.mode === 'foursquare') {
        showLoading('Checking what\'s open in Honolulu…');
        try {
            const results = await runFoursquareSearch();
            hideLoading();
            renderResults(results, true);
        } catch (err) {
            showError(err.message);
        }
    } else {
        renderResults(filterCurated(), false);
    }
}

// ─── GEOLOCATION ─────────────────────────────────────────────
function requestLocation() {
    const btn    = document.getElementById('location-btn');
    const status = document.getElementById('location-status');

    if (!navigator.geolocation) {
        showLocationStatus('Geolocation not supported by your browser.', true);
        return;
    }

    btn.textContent = '⏳ Getting location…';
    btn.disabled    = true;

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.userLat = pos.coords.latitude;
            state.userLng = pos.coords.longitude;
            btn.textContent = '✓ Location on';
            btn.classList.add('active');
            btn.disabled = false;

            document.getElementById('radius-group').style.display = '';
            document.getElementById('sort-group').style.display   = '';

            const dist = haversineDistance(state.userLat, state.userLng, 21.3069, -157.8583);
            showLocationStatus(
                dist < 25
                    ? '📍 Got your location! Distances shown from where you are.'
                    : `📍 Location found (${dist.toFixed(0)} mi from Honolulu center).`,
                false
            );
        },
        (err) => {
            const msgs = {
                1: 'Location access denied — check browser permissions.',
                2: 'Location unavailable.',
                3: 'Location request timed out.',
            };
            btn.textContent = '📍 Use my location';
            btn.disabled    = false;
            showLocationStatus(msgs[err.code] || 'Could not get location.', true);
        },
        { timeout: 10000, enableHighAccuracy: false }
    );
}

function showLocationStatus(msg, isError) {
    const el = document.getElementById('location-status');
    el.textContent  = msg;
    el.className    = 'location-status' + (isError ? ' error' : '');
    el.classList.remove('hidden');
}

// ─── MODE MANAGEMENT ─────────────────────────────────────────
function setFoursquareMode(key) {
    state.apiKey = key;
    state.mode   = 'foursquare';
    localStorage.setItem('wwdrn_fsq_key', key);
    const badge       = document.getElementById('mode-badge');
    badge.textContent = '🟠 Foursquare Live';
    badge.className   = 'mode-badge live';
}

function setCuratedMode() {
    state.mode              = 'curated';
    const badge             = document.getElementById('mode-badge');
    badge.textContent       = 'Curated List';
    badge.className         = 'mode-badge';
}

// ─── CHIP BINDING ─────────────────────────────────────────────
function bindChips(containerId, filterKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.filters[filterKey] = chip.dataset.val;
        });
    });
}

// ─── INIT ────────────────────────────────────────────────────
function init() {
    bindChips('time-chips',     'time');
    bindChips('budget-chips',   'budget');
    bindChips('group-chips',    'group');
    bindChips('category-chips', 'category');
    bindChips('radius-chips',   'radius');
    bindChips('sort-chips',     'sort');

    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('location-btn').addEventListener('click', requestLocation);

    document.getElementById('settings-btn').addEventListener('click', () => {
        if (state.apiKey) document.getElementById('api-key-input').value = state.apiKey;
        document.getElementById('api-modal').classList.remove('hidden');
    });

    document.getElementById('save-api-key').addEventListener('click', () => {
        const key = document.getElementById('api-key-input').value.trim();
        if (!key || key.length < 10) {
            alert('Please paste a valid Foursquare API key.');
            return;
        }
        setFoursquareMode(key);
        document.getElementById('api-modal').classList.add('hidden');
    });

    document.getElementById('use-demo').addEventListener('click', () => {
        setCuratedMode();
        document.getElementById('api-modal').classList.add('hidden');
    });

    document.getElementById('close-detail').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.add('hidden');
    });
    document.getElementById('detail-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('detail-modal'))
            document.getElementById('detail-modal').classList.add('hidden');
    });
    document.getElementById('api-modal').addEventListener('click', e => {
        if (e.target === document.getElementById('api-modal'))
            document.getElementById('api-modal').classList.add('hidden');
    });
}

document.addEventListener('DOMContentLoaded', init);
