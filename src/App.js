import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import LeafletMap from "./components/LeafletMap";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Debug cities state changes
  useEffect(() => {
    console.log('Cities state changed:', cities);
  }, [cities]);

  const fetchCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCurrentLocation({ lat, lon });
          setLoading(false);
          alert(`Location fetched: ${lat}, ${lon}`);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to fetch location. Please check if location is enabled.');
          setLoading(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  useEffect(() => {
    console.log('🚀 App mounted, fetching states...');
    axios.get("http://localhost:5000/locations")
      .then(res => {
        console.log('✅ Locations response:', res.data);
        const states = res.data.states || [];
        console.log('📍 States count:', states.length);
        console.log('📍 First few states:', states.slice(0, 5));
        setLocations(states);
      })
      .catch(err => {
        console.error('❌ Failed to load locations');
        console.error('❌ Error message:', err.message);
        console.error('❌ Error details:', err);
        alert('Failed to load states. Please check if backend is running at http://localhost:5000');
      });
  }, []);

  useEffect(() => {
    if (selectedState) {
      console.log('🔍 Fetching cities for state:', selectedState);
      const url = `http://localhost:5000/cities?state=${encodeURIComponent(selectedState)}`;
      console.log('🌐 Request URL:', url);
      axios.get(url).then(res => {
        console.log('✅ Cities response received:', res.data);
        console.log('📍 Cities array:', res.data.cities);
        console.log('📊 Cities count:', res.data.cities ? res.data.cities.length : 0);
        const citiesList = res.data.cities || [];
        setCities(citiesList);
        setSelectedCity(citiesList && citiesList[0] ? citiesList[0] : "");
        console.log('✨ Cities state updated:', citiesList);
      }).catch(err => {
        console.error('❌ Cities fetch error:', err.message);
        console.error('❌ Error details:', err);
        setCities([]);
        setSelectedCity("");
      });
    } else {
      console.log('No state selected, clearing cities');
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedState]);

  const fetchData = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      alert("From date cannot be later than To date.");
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (selectedState) params.state = selectedState;
      if (selectedCity) params.city = selectedCity;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      const res = await axios.get("http://localhost:5000/fetch-data", { params });
      setData(res.data);
    } catch (err) {
      console.error("Fetch error", err);
      const fallback = err.response ? `${err.response.status}: ${err.response.statusText}` : err.message;
      alert(`Failed to fetch data. ${fallback}`);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = new Blob([buffer], { type: "application/octet-stream" });

    saveAs(file, "all_india_leads.xlsx");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>🏢 All India Business Dashboard</h2>
        <p>Extract and analyze business data across India</p>
        <div className="stats">
          <span>📊 {locations.length} States</span>
          <span>🏙️ {cities.length} Cities</span>
        </div>
      </div>

      <div className="controls-section">
        <div className="controls-row">
          <div className="control-group">
            <label>State</label>
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">-- Select State --</option>
              {locations.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>City</label>
            <select 
              value={selectedCity} 
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">-- Select City --</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>From Date</label>
            <input type="month" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="control-group">
            <label>To Date</label>
            <input type="month" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div className="button-group">
            <button className="btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "🔄 Fetching..." : "📊 Fetch Data"}
            </button>
            <button className="btn-secondary" onClick={fetchCurrentLocation} disabled={loading}>
              📍 My Location
            </button>
            <button className="btn-secondary" onClick={exportExcel}>
              📥 Export Excel
            </button>
            <button className="btn-secondary" onClick={() => window.open('/business-finder.html', '_blank')}>
              🗺️ Nearby Finder
            </button>
          </div>
        </div>
      </div>

      <div className="map-section">
        <LeafletMap
          points={data}

          currentLocation={currentLocation}
          onLocationSelected={(kind, position) => {
            console.log(`${kind} selected`, position);
          }}
          onRouteInfo={setRouteInfo}
        />
      </div>

      {routeInfo && (
        <div className="route-info">
          🚗 Route: {(routeInfo.distanceMeters/1000).toFixed(2)} km, {(routeInfo.durationSeconds/60).toFixed(1)} min
        </div>
      )}

      {loading && <div className="loading">⏳ Loading business data...</div>}

      <div className="business-table-container">
        <table className="business-table">
          <thead>
            <tr>
              <th>State</th>
              <th>City</th>
              <th>Type</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Address</th>
              <th>Rating</th>
              <th>Reviews</th>
              <th>Postal Code</th>
              <th>Geocode City</th>
              <th>Geocode State</th>
              <th>Created At</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, i) => (
              <tr key={i}>
                <td>{item.state}</td>
                <td>{item.city}</td>
                <td>{item.type}</td>
                <td>{item.name}</td>
                <td>{item.phone}</td>
                <td>{item.mobile}</td>
                <td>{item.email}</td>
                <td>{item.address}</td>
                <td>{item.rating}</td>
                <td>{item.reviews}</td>
                <td>{item.postal_code}</td>
                <td>{item.geocode_city}</td>
                <td>{item.geocode_state}</td>
                <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;

