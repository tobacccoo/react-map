import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = "pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ";

const categoryData = {
  Population: [
    { id: 1, coordinates: [72.8701, 19.3621], name: "Residential Area 1" },
    { id: 2, coordinates: [72.8753, 19.3658], name: "Residential Area 2" },
  ],
  Educational: [
    { id: 3, coordinates: [72.8685, 19.3617], name: "School 1" },
    { id: 4, coordinates: [72.8738, 19.3682], name: "University 1" },
  ],
  Economic: [
    { id: 5, coordinates: [72.8760, 19.3595], name: "Shopping Mall 1" },
    { id: 6, coordinates: [72.8802, 19.3640], name: "Factory 1" },
  ],
  Connectivity: [
    { id: 7, coordinates: [72.8825, 19.3582], name: "Railway Station" },
    { id: 8, coordinates: [72.8787, 19.3629], name: "Highway Entry" },
  ],
};

const MarketPotential = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const markersRef = useRef([]); // Store active markers

  useEffect(() => {
    const initializeMap = () => {
      const newMap = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v11",
        center: [72.8727, 19.36017],
        zoom: 14,
      });
      setMap(newMap);
    };
    initializeMap();
  }, []);

  useEffect(() => {
    if (!map) return;

    // Remove existing markers before adding new ones
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (selectedCategory) {
      categoryData[selectedCategory].forEach((item) => {
        const marker = new mapboxgl.Marker({ color: "red" })
          .setLngLat(item.coordinates)
          .setPopup(new mapboxgl.Popup().setText(item.name))
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [selectedCategory, map]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.8)",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        {Object.keys(categoryData).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            style={{
              background: selectedCategory === category ? "#007bff" : "#f8f9fa",
              color: selectedCategory === category ? "#fff" : "#000",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarketPotential;
