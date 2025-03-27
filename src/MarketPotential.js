import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ";

const categoryFilters = {
  Schools: 'amenity="school"',
  Hospitals: 'amenity="hospital"',
  Colleges: 'amenity~"college|university"',
  // Add more categories
};

const styles = `
  .map-controls {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .filter-button {
    display: block;
    margin: 5px 0;
    padding: 8px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    cursor: pointer;
  }

  .filter-button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .loading-indicator {
    padding: 8px;
    color: #666;
    font-size: 0.9em;
  }
`;

const MarketPotential = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!map) return;
  
    map.on('load', () => {
      map.addSource('population-density', {
        type: 'raster',
        tiles: ['https://ghslsys.jrc.ec.europa.eu/imagery/population/{z}/{x}/{y}.png'],
        tileSize: 256
      });
      map.addLayer({
        id: 'population-layer',
        type: 'raster',
        source: 'population-density',
        paint: { 'raster-opacity': 0.6 }
      });
  
      map.addLayer({
        id: 'population-layer',
        type: 'raster',
        source: 'population-density',
        minzoom: 0,
        maxzoom: 22,
        paint: {
          'raster-opacity': 0.6
        }
      });
    });
  }, [map]);

  useEffect(() => {
    if (!map || !selectedCategory) return;

    const fetchPOIData = async () => {
      setLoading(true);
      try {
        const bounds = map.getBounds();
        const overpassQuery = `[out:json];
          node[${categoryFilters[selectedCategory]}] 
            (${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
          out;`;
        
        const response = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
        );
        
        const data = await response.json();
        
        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        data.elements.forEach(element => {
          const marker = new mapboxgl.Marker()
            .setLngLat([element.lon, element.lat])
            .setPopup(new mapboxgl.Popup().setHTML(element.tags.name || 'Unnamed'))
            .addTo(map);
          markersRef.current.push(marker);
        });
      } catch (error) {
        console.error("Error fetching POI data:", error);
      }
      setLoading(false);
    };

    fetchPOIData();
  }, [selectedCategory, map]);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Updated controls with proper styling */}
      <div className="map-controls">
        <style>{styles}</style>
        {Object.keys(categoryFilters).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(prev => prev === category ? null : category)}
            className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
          >
            {category}
          </button>
        ))}
        {loading && <div className="loading-indicator">Loading...</div>}
      </div>
    </div>
  );
};

export default MarketPotential;