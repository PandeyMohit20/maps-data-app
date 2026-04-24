const axios = require("axios");

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon required" });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "maps-data-app" }
    });
    res.json(response.data);
  } catch (err) {
    console.error("Reverse geocoding error:", err.message);
    res.status(500).json({ error: err.message });
  }
}