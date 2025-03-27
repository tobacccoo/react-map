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

  // Map initialization
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v11",
      center: [72.8727, 19.36017],
      zoom: 12
    });
    setMap(map);
    return () => map.remove();
  }, []);

  // Marker handling
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

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        data.elements.forEach(element => {
          const coords = element.center ? [element.center.lon, element.center.lat] : [element.lon, element.lat];
          const marker = new mapboxgl.Marker({
            color: getMarkerColor(selectedCategory)
          })
            .setLngLat(coords)
            .setPopup(new mapboxgl.Popup().setHTML(`
              <strong>${getCategoryLabel(selectedCategory, element)}</strong><br>
              ${element.tags.name || 'Residential Area'}
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

 
  const getMarkerColor = (category) => {
    const colors = {
      Population: '#FF6B6B',  // Red for residential
      Educational: '#4ECDC4', // Teal for education
      Economic: '#FFE66D',    // Yellow for economic
      Connectivity: '#9B59B6' // Purple for connectivity
    };
    return colors[category] || '#333';
  };

  const getCategoryLabel = (category, element) => {
    return categoryFilters[category].find(sub => 
      element.tags?.building?.includes(sub.query.split('"')[1]) ||
      element.tags?.landuse?.includes(sub.query.split('"')[1])
    )?.label || category;
  };

  // Add this CSS for proper filter visibility
  const styles = `
    .map-controls {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.95);
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .filter-button {
      padding: 10px 15px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      background: #f0f0f0;
      color: #333;
      font-weight: 500;
      transition: all 0.2s;
    }

    .filter-button.active {
      background: #007bff;
      color: white;
    }

    .loading-indicator {
      padding: 10px;
      color: #666;
      font-style: italic;
    }
  `;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <style>{styles}</style>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      <div className="map-controls">
        {Object.keys(categoryFilters).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(prev => prev === category ? null : category)}
            className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
          >
            {category}
          </button>
        ))}
        {loading && <div className="loading-indicator">Loading data...</div>}
      </div>
    </div>
  );
};

export default MarketPotential;