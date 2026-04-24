const axios = require("axios");

let locationsData = null;

async function loadIndiaLocations() {
  if (locationsData) return locationsData;

  try {
    const statesUrl = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json";
    const countriesStatesCitiesUrl = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json";

    const [statesResp, countriesResp] = await Promise.all([axios.get(statesUrl), axios.get(countriesStatesCitiesUrl)]);
    const allStates = statesResp.data;
    const allCountries = countriesResp.data;

    const indiaStates = allStates.filter((s) => s.country_code === "IN");

    const map = {};
    indiaStates.forEach((state) => {
      map[state.name] = [];
    });

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

    for (const key of Object.keys(map)) {
      map[key] = Array.from(new Set(map[key])).sort();
    }

    locationsData = map;
    return locationsData;
  } catch (err) {
    console.error("Failed to load India state/city data", err.message);
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
    return locationsData;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = await loadIndiaLocations();
    res.json({ states: Object.keys(data).sort() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}