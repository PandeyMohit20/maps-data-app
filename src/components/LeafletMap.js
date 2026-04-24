import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/locationPulse.css";

const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjY4MWZjMTExZWQ3ZTRjOWY4Y2M1MzY3YWM5YmFlODU1IiwiaCI6Im11cm11cjY0In0=";

const pulseIcon = L.divIcon({
  className: "pulse-marker",
  iconSize: [20, 20],
});

function LocationSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function MapController({ currentPos, pickup, drop, route, points, currentLocation }) {
  const map = useMap();

  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lon], 16);
    } else if (currentPos && !pickup && !drop && (!points || points.length === 0)) {
      map.setView(currentPos, 16);
    }
  }, [currentPos, pickup, drop, points, currentLocation, map]);

  useEffect(() => {
    if (route.length > 0 && pickup && drop) {
      map.fitBounds(route, { padding: [60, 60] });
      return;
    }

    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
      return;
    }

    if (pickup && !drop) {
      map.setView([pickup.lat, pickup.lon], 15);
      return;
    }

    if (drop && !pickup) {
      map.setView([drop.lat, drop.lon], 15);
      return;
    }
  }, [pickup, drop, route, points, map]);

  return null;
}

function LeafletMap({ points = [], currentLocation, onLocationSelected, routeInfo }) {
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [route, setRoute] = useState([]);
  const [currentPos, setCurrentPos] = useState([28.6139, 77.209]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentPos([pos.coords.latitude, pos.coords.longitude]),
      () => setCurrentPos([28.6139, 77.209]),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!pickup || !drop) return;

    const fetchRoute = async () => {
      const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            Authorization: ORS_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coordinates: [[pickup.lon, pickup.lat], [drop.lon, drop.lat]],
          }),
        }
      );

      const data = await res.json();
      const feat = data.features && data.features[0];
      if (feat) {
        const coords = feat.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoute(coords);

        const summary = feat.properties && feat.properties.summary;
        if (summary && typeof routeInfo === "function") {
          routeInfo({
            distanceMeters: summary.distance,
            durationSeconds: summary.duration,
          });
        }
      }
    };

    fetchRoute();
  }, [pickup, drop, routeInfo]);

  function ResizeHandler() {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      const t = setTimeout(() => map.invalidateSize(), 100);
      const onResize = () => map.invalidateSize();
      const onVisibility = () => setTimeout(() => map.invalidateSize(), 120);
      const onFullscreen = () => setTimeout(() => map.invalidateSize(), 150);

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVisibility);
      document.addEventListener("fullscreenchange", onFullscreen);

      return () => {
        clearTimeout(t);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        document.removeEventListener("fullscreenchange", onFullscreen);
      };
    }, [map]);
    return null;
  }

  const buildGoogleDirectionsUrl = (target) => {
    const destination = `${target.lat},${target.lon ?? target.lng}`;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

    if (currentPos && currentPos[0] && currentPos[1]) {
      const origin = `${currentPos[0]},${currentPos[1]}`;
      url += `&origin=${encodeURIComponent(origin)}`;
    }

    return url;
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      <MapContainer
        center={currentPos}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <ResizeHandler deps={[currentPos, pickup, drop, route.length]} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController currentPos={currentPos} pickup={pickup} drop={drop} route={route} points={points} currentLocation={currentLocation} />
        <LocationSelector
          onSelect={async (pos) => {
            let extra = null;
            try {
              const res = await axios.get(`http://localhost:5000/reverse?lat=${pos.lat}&lon=${pos.lon}`);
              extra = res.data;
            } catch (err) {
              console.warn("Reverse lookup failed", err.message);
            }

            const payload = {
              ...pos,
              address: extra?.display_name || "",
            };

            if (!pickup) {
              setPickup(payload);
              onLocationSelected?.("pickup", payload);
            } else if (!drop) {
              setDrop(payload);
              onLocationSelected?.("drop", payload);
            } else {
              setPickup(payload);
              setDrop(null);
              setRoute([]);
              onLocationSelected?.("pickup", payload);
            }
          }}
        />

        <Marker position={currentPos} icon={pulseIcon} />

        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lon]}>
            <Popup>
              <strong>Your Current Location</strong><br />
              Lat: {currentLocation.lat}<br />
              Lon: {currentLocation.lon}
            </Popup>
          </Marker>
        )}

        {points && points.length > 0 && points.map((item, idx) => (
          item.lat && item.lng ? (
            <Marker key={`point-${idx}`} position={[item.lat, item.lng]}>
              <Popup>
                <strong>{item.name}</strong><br />
                {item.address}<br />
                {item.phone}<br />
                {item.rating} ⭐ ({item.reviews} reviews)<br />
                <a
                  href={buildGoogleDirectionsUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: "6px", color: "#6366f1" }}
                >
                  � directions in Google Maps
                </a>
              </Popup>
            </Marker>
          ) : null
        ))}

        {pickup && <Marker position={[pickup.lat, pickup.lon]} />}
        {drop && <Marker position={[drop.lat, drop.lon]} />}

        {route.length > 0 && <Polyline positions={route} color="#00ff88" weight={5} />}
      </MapContainer>
    </div>
  );
}

export default LeafletMap;
