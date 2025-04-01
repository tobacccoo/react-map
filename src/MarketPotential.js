import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ";

const categoryFilters = {
  Population: [
    { query: 'building="residential"', label: 'Residential Buildings' },
    { query: 'building="apartments"', label: 'Housing Societies' },
    { query: 'landuse="residential"', label: 'Residential Zones' }
  ],
  Educational: [
    { query: 'amenity="school"', label: 'Schools' },
    { query: 'amenity="college"', label: 'Colleges' },
    { query: 'amenity="university"', label: 'Universities' }
  ],
  Economic: [
    { query: 'building="industrial"', label: 'Factories' },
    { query: 'office="*"', label: 'Offices' },
    { query: 'amenity="hospital"', label: 'Hospitals' },
    { query: 'shop="*"', label: 'Shops' },
    { query: 'building="retail"', label: 'Shopping Malls' }
  ],
  Connectivity: [
    { query: 'railway="station"', label: 'Railway Stations' },
    { query: 'highway="motorway"', label: 'Highways' }
  ]
};

const MarketPotential = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v11",
      center: [72.8727, 19.36017],
      zoom: 12
    });

    setMap(mapInstance);
    return () => mapInstance.remove();
  }, []);

  useEffect(() => {
    if (!map || !selectedCategory) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const bounds = map.getBounds();
        const queries = categoryFilters[selectedCategory]
          .map(sub => `nwr[${sub.query}] (${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});`)
          .join('');

        const overpassQuery = `[out:json];(${queries});out center;`;
        const response = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
        );
        const data = await response.json();

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        data.elements.forEach(element => {
          const coords = element.center ? [element.center.lon, element.center.lat] : [element.lon, element.lat];
          const marker = new mapboxgl.Marker({ color: getMarkerColor(selectedCategory) })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
              <strong>${getCategoryLabel(selectedCategory, element)}</strong><br>
              ${element.tags.name || 'Unknown Location'}
              ${element.tags['addr:street'] ? `<br>${element.tags['addr:street']}` : ''}
            `))
            .addTo(map);
          markersRef.current.push(marker);
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedCategory, map]);

  const getMarkerColor = (category) => ({
    Population: '#FF6B6B',
    Educational: '#4ECDC4',
    Economic: '#FFE66D',
    Connectivity: '#9B59B6'
  }[category] || '#333');

  const getCategoryLabel = (category, element) =>
    categoryFilters[category].find(sub => 
      element.tags?.building?.includes(sub.query.split('"')[1]) ||
      element.tags?.landuse?.includes(sub.query.split('"')[1])
    )?.label || category;

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 2) {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      setSearchResults(data.features);
    } else {
      setSearchResults([]);
    }
  };

  const handleLocationSelect = (place) => {
    setSearchQuery(place.place_name);
    setSearchResults([]);

    if (map) {
      const [lng, lat] = place.center;
      map.flyTo({ center: [lng, lat], zoom: 14 });
    }
  };


  

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
    
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Search Box (Top Center) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '300px'
      }}>
        <input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={handleSearchChange}
          style={{
            width: '93%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        {searchResults.length > 0 && (
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            position: 'absolute',
            top: '40px',
            left: 0,
            width: '100%',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {searchResults.map((place) => (
              <li
                key={place.id}
                onClick={() => handleLocationSelect(place)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
              >
                {place.place_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category Filters (Left Sidebar - Buttons Visible) */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        {Object.keys(categoryFilters).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(prev => prev === category ? null : category)}
            className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
            style={{ display: 'block', marginBottom: '5px', padding: '10px', cursor: 'pointer' }}
          >
            {category}
          </button>
        ))}
        {loading && <div className="loading-indicator" style={{
    padding: '10px',
    color:' #666',
    fontStyle: 'italic'
  }}>Loading data...</div>}
      </div>
    </div>
  );
};

export default MarketPotential;
