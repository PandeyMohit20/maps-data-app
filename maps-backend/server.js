require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// dynamically built state/city map
let locationsData = {}; 
let locationsLoaded = false;

async function loadIndiaLocations() {
  try {
    // states + cities dataset from GitHub (dr5hn) - files are in json/ directory
    const statesUrl = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json";
    const countriesStatesCitiesUrl = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json";

    const [statesResp, countriesResp] = await Promise.all([axios.get(statesUrl), axios.get(countriesStatesCitiesUrl)]);
    const allStates = statesResp.data;
    const allCountries = countriesResp.data;

    // filter India states
    const indiaStates = allStates.filter((s) => s.country_code === "IN");

    // build map from states
    const map = {};
    indiaStates.forEach((state) => {
      map[state.name] = [];
    });

    // extract cities from combined countries+states+cities dataset
    const indiaCountry = allCountries.find((country) => country.iso2 === "IN" || country.name === "India");
    if (indiaCountry && indiaCountry.states) {
      indiaCountry.states.forEach((stateWithCities) => {
        const stateName = stateWithCities.name;
        if (map[stateName] && stateWithCities.cities) {
          stateWithCities.cities.forEach((city) => {
            map[stateName].push(city.name);
          });
        }
      });
    }

    // dedup and sort

    // dedup and sort
    for (const key of Object.keys(map)) {
      map[key] = Array.from(new Set(map[key])).sort();
    }

    locationsData = map;
    locationsLoaded = true;
    console.log("✅ Loaded dynamic India states/cities", Object.keys(locationsData).length, "states");
  } catch (err) {
    console.error("❌ Failed to load India state/city data", err.message);
    // fallback to comprehensive built-in list
    locationsData = {
      "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kakinada"],
      "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
      "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia"],
      "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga"],
      "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Raigarh"],
      "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
      "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
      "Haryana": ["Chandigarh", "Faridabad", "Gurgaon", "Hisar", "Panipat", "Ambala"],
      "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Kullu", "Solan", "Mandi"],
      "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar"],
      "Karnataka": ["Bengaluru", "Mysore", "Mangalore", "Hubli", "Belgaum", "Gulbarga"],
      "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad"],
      "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar"],
      "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
      "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
      "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
      "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
      "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang"],
      "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"],
      "Punjab": ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
      "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
      "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
      "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahabubnagar"],
      "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar"],
      "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi"],
      "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur"],
      "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur"],
      "Delhi": ["New Delhi", "Delhi", "Karol Bagh", "Connaught Place"],
      "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
      "Ladakh": ["Leh", "Kargil", "Drass"],
      "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
    };
    locationsLoaded = true;
  }
}

// ✅ keywords - curated for variety
let keywords = [
  "restaurant", "cafe", "fast food", "hotel", "bank", "hospital", "school", "gym", "pharmacy", "supermarket"
];

// shuffle keywords for variety
keywords = keywords.sort(() => Math.random() - 0.5);

// ================= MAIN FETCH =================

app.get("/locations", (req, res) => {
  res.json({ states: Object.keys(locationsData).sort() });
});

app.get("/cities", (req, res) => {
  const state = req.query.state;
  console.log('Cities request for state:', `"${state}"`);
  console.log('State length:', state ? state.length : 0);
  console.log('Available states sample:', Object.keys(locationsData).slice(0, 5));
  if (!state) {
    return res.status(400).json({ error: "state required" });
  }
  
  // Try exact match first
  let cities = locationsData[state];
  console.log('Exact match result:', cities ? cities.length : 'not found');
  
  // If not found, try case-insensitive match
  if (!cities) {
    const stateKey = Object.keys(locationsData).find(key => key.toLowerCase() === state.toLowerCase());
    if (stateKey) {
      cities = locationsData[stateKey];
      console.log('Case-insensitive match found:', stateKey);
    }
  }
  
  // If still not found, try partial match
  if (!cities) {
    const stateKey = Object.keys(locationsData).find(key => key.toLowerCase().includes(state.toLowerCase()) || state.toLowerCase().includes(key.toLowerCase()));
    if (stateKey) {
      cities = locationsData[stateKey];
      console.log('Partial match found:', stateKey);
    }
  }
  
  cities = cities || [];
  console.log('Final cities count:', cities.length);
  res.json({ cities });
});

app.get("/fetch-data", async (req, res) => {
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
        const daysBack = Math.floor(Math.random() * 30); // last 30 days for "newly registered"
        const simulatedDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        simulatedDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        // Extract postal code from Nominatim address when possible, else fallback to display_name heuristics
        let postalCode = "N/A";
        if (r.postcode) {
          postalCode = r.postcode;
        } else if (r.address && r.address.postcode) {
          postalCode = r.address.postcode;
        } else if (r.display_name) {
          const parts = r.display_name.split(',').map(p => p.trim());
          // Find first 6-digit token from the end (India PIN code)
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

    // apply optional date range filter by created_at (month-based)
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
        to.setDate(0); // last day of requested to-month
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

    // limit results to 100 for performance
    if (finalData.length > 100) {
      finalData = finalData.slice(0, 100);
    }

    console.log("✅ FINAL COUNT:", finalData.length);

    res.json(finalData);

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================

// Start server after loading data
(async () => {
  console.log('⏳ Loading location data...');
  await loadIndiaLocations();
  
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
  });
})();