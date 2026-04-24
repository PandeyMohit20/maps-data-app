const axios = require("axios");

let keywords = [
  "restaurant", "cafe", "fast food", "hotel", "bank", "hospital", "school", "gym", "pharmacy", "supermarket"
];

keywords = keywords.sort(() => Math.random() - 0.5);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("🔥 API HIT");
  console.log("📥 Query:", req.query);

  const { state, city, fromDate, toDate } = req.query;

  if (!state || !city) {
    return res.status(400).json({ error: "state and city required" });
  }

  let finalData = [];

  try {
    for (let keyword of keywords) {
      const url = `https://nominatim.openstreetmap.org/search?q=${city}+${keyword}&format=json&limit=10`;

      console.log("🌐 URL:", url);

      const response = await axios.get(url, {
        headers: { "User-Agent": "maps-data-app" }
      });

      console.log(`📊 ${keyword}:`, response.data.length);

      if (response.data.length > 0) {
        console.log(`   ✅ ${keyword} has data`);
      }

      response.data.forEach((r, idx) => {
        const now = new Date();
        const recordIndex = finalData.length;
        const daysBack = Math.floor(Math.random() * 30);
        const simulatedDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        simulatedDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        let postalCode = "N/A";
        if (r.postcode) {
          postalCode = r.postcode;
        } else if (r.address && r.address.postcode) {
          postalCode = r.address.postcode;
        } else if (r.display_name) {
          const parts = r.display_name.split(',').map(p => p.trim());
          const candidate = parts
            .reverse()
            .find(part => /^\d{6}$/.test(part));
          if (candidate) {
            postalCode = candidate;
          }
        }

        const businessName = r.display_name ? r.display_name.split(',')[0] : keyword;
        const validEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        let phone = "N/A";
        if (typeof r.phone === 'string' && r.phone.trim()) {
          phone = r.phone.trim();
        } else if (r.extratags && typeof r.extratags.phone === 'string' && r.extratags.phone.trim()) {
          phone = r.extratags.phone.trim();
        }

        let email = "N/A";
        if (validEmail(r.email)) {
          email = r.email.trim();
        } else if (r.extratags && validEmail(r.extratags.email)) {
          email = r.extratags.email.trim();
        }

        const geocodeCity = (r.address && (r.address.city || r.address.town || r.address.village || r.address.hamlet || r.address.county)) || city;
        const geocodeState = (r.address && (r.address.state || r.address.region)) || state;

        finalData.push({
          state,
          city,
          name: businessName || keyword,
          type: keyword,
          phone,
          mobile: phone,
          email,
          address: r.display_name,
          rating: 0,
          reviews: 0,
          postal_code: postalCode,
          geocode_city: geocodeCity,
          geocode_state: geocodeState,
          lat: r.lat,
          lng: r.lon,
          created_at: simulatedDate.toISOString()
        });
      });
    }

    if (fromDate || toDate) {
      let from = null;
      let to = null;

      if (fromDate) {
        from = new Date(`${fromDate}-01`);
        if (isNaN(from)) {
          return res.status(400).json({ error: "Invalid fromDate" });
        }
      }

      if (toDate) {
        to = new Date(`${toDate}-01`);
        if (isNaN(to)) {
          return res.status(400).json({ error: "Invalid toDate" });
        }
        to.setMonth(to.getMonth() + 1);
        to.setDate(0);
      }

      if (from && to && from > to) {
        return res.status(400).json({ error: "fromDate must be <= toDate" });
      }

      finalData = finalData.filter(item => {
        const itemDate = new Date(item.created_at);
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }

    if (finalData.length > 100) {
      finalData = finalData.slice(0, 100);
    }

    console.log("✅ FINAL COUNT:", finalData.length);

    res.json(finalData);

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
}