const axios = require('axios');

(async () => {
  try {
    const loc = await axios.get('http://localhost:5000/locations');
    console.log('locations status', loc.status);
    console.log('locations data', loc.data);
  } catch (err) {
    console.error('locations fail', err.message);
  }

  try {
    const data = await axios.get('http://localhost:5000/fetch-data?state=Maharashtra&city=Mumbai');
    console.log('fetch-data status', data.status);
    console.log('fetch-data count', Array.isArray(data.data) ? data.data.length : 0);
    console.log('fetch-data first item', data.data[0]);
  } catch (err) {
    console.error('fetch-data fail', err.message);
  }
})();