import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMapGL, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import { area } from '@turf/area';
import { polygon, lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';

// Coordinate validation utilities
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeParse = (num, fallback) => {
  const parsed = Number(num);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const validateCoordinate = (coord) => {
  if (!coord || typeof coord !== "object") return { longitude: 0, latitude: 0 };
  return {
    longitude: clamp(safeParse(coord.longitude, 0), -180, 180),
    latitude: clamp(safeParse(coord.latitude, 0), -90, 90)
  };
};
const zoningAreas = [
    {
      id: "zone1",
      name: "Commercial Zone", // Switched from Residential
      color: "#ff5733", // Switched to RED
      coordinates: [
        [72.8695, 19.3700],
        [72.8680, 19.3685],
        [72.8692, 19.3668],
        [72.8725, 19.3663],
        [72.8728, 19.3685]
      ],
      report: { type: "Commercial", maxHeight: "50m", density: "High" }
    },
    {
      id: "zone2",
      name: "Residential Zone", // Switched from Commercial
      color: "#ff5733", // Switched to YELLOW
      coordinates: [
        [72.8785, 19.3665],
        [72.8768, 19.3648],
        [72.8772, 19.3625],
        [72.8810, 19.3623],
        [72.8815, 19.3650]
      ],
      report: { type: "Residential", maxHeight: "10m", density: "Low" }
    },
    {
      id: "zone3",
      name: "Agricultural Zone",
      color: "#ffcc00", // GREEN remains the same
      coordinates: [
        [72.8740, 19.3620],
        [72.8722, 19.3602],
        [72.8748, 19.3585],
        [72.8765, 19.3583],
        [72.8768, 19.3610]
      ],
      report: { type: "Agricultural", maxHeight: "5m", density: "Medium" }
    },
    {
      id: "zone4",
      name: "Industrial Zone",
      color: "#3366ff", // BLUE remains the same, but bigger area
      coordinates: [
        [72.8805, 19.3720],
        [72.8788, 19.3695],
        [72.8792, 19.3678],
        [72.8835, 19.3673],
        [72.8840, 19.3705]
      ],
      report: { type: "Industrial", maxHeight: "80m", density: "Very High" }
    }
  ];
  
  
const MapComponent = ({zoningReport, propertyDetails}) => {
  // State management
  const [viewport, setViewport] = useState({
    latitude: 19.36017,
    longitude: 72.8727,
    zoom: 15,
    pitch: 0,
    bearing: 0
  });

  const [points, setPoints] = useState([]);
  const [calculatedArea, setCalculatedArea] = useState(null);
  const [is3D, setIs3D] = useState(false);
  const mapRef = useRef(null);
  const [selectedReport, setSelectedReport] = useState(null)
  const [drawnPolygons, setDrawnPolygons] = useState([]);  // Stores saved polygons



const savePolygon = () => {
  if (points.length < 3) {
    console.warn("Polygon must have at least 3 points.");
    return;
  }
  
  // Create a copy of the current polygon coordinates
  const newPolygon = points.map(p => [p.longitude, p.latitude]);
  
  // Add to drawn polygons and reset current points
  setDrawnPolygons(prev => [...prev, newPolygon]);
  setPoints([]);
};

  
  // Marker interaction
  const handleMarkerDrag = useCallback((index, lngLat) => {
    if (!lngLat) return;
    
    setPoints(prev => {
      if (!prev[index]) return prev;
      const newPoints = [...prev];
      newPoints[index] = validateCoordinate({
        longitude: lngLat.lng,
        latitude: lngLat.lat
      });
      return newPoints;
    });
  }, []);

  const insidePolygon = (point, polygon) => {
    const [lng, lat] = [point.lng, point.lat];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };
  

  // Map click handling
  // const handleMapClick = useCallback((event) => {
  //   if (!event || !event.lngLat || isNaN(event.lngLat.lng) || isNaN(event.lngLat.lat)) {
  //     console.error("Invalid map click event:", event);
  //     return;
  //   }
  
  //   const { lngLat } = event;
  //   if (!lngLat) return;
  
  //   // Check if clicked inside a zoning area
  //   const clickedZone = zoningAreas.find((zone) =>
  //     insidePolygon(lngLat, zone.coordinates)
  //   );
  
  //   if (clickedZone) {
  //     setSelectedReport(clickedZone.report);
  //     return; // Prevent adding markers when clicking a zoning area
  //   }
  
  //   // Prevent marker placement in zoningReport or propertyDetails mode
  //   if (zoningReport || propertyDetails) return;
  
  //   // Add a new marker in development planning mode
  //   setPoints(prev => [...prev, { longitude: lngLat.lng, latitude: lngLat.lat }]);
  
  // }, [zoningReport, propertyDetails]);

  const handleMapClick = useCallback((event) => {
    if (!event || !event.lngLat || isNaN(event.lngLat.lng) || isNaN(event.lngLat.lat)) {
      console.error("Invalid map click event:", event);
      return;
    }
  
    const { lngLat } = event;
    if (!lngLat) return;
  
    // Check if clicked inside a zoning area
    const clickedZone = zoningAreas.find((zone) =>
      insidePolygon(lngLat, zone.coordinates)
    );
  
    // Show zoning report only if NOT in Development Planning mode
    if (clickedZone && (zoningReport || propertyDetails)) {
      setSelectedReport(clickedZone.report);
      return;
    }
  
    // Allow marker placement in Development Planning (even in zoning areas)
    if (!zoningReport && !propertyDetails) {
      setPoints(prev => [...prev, { longitude: lngLat.lng, latitude: lngLat.lat }]);
    }
  
  }, [zoningAreas, zoningReport, propertyDetails]);
  

  
  useEffect(() => {
    if (zoningReport || propertyDetails) {

      setSelectedReport(null);  // Ensure no previous selection is visible
    }
  }, [zoningReport, propertyDetails]);

  // Area calculation
  useEffect(() => {
    try {
      if (points.length >= 3) {
        const validPoints = points.map(validateCoordinate);
        const coordinates = [
          ...validPoints.map(p => [p.longitude, p.latitude]),
          [validPoints[0].longitude, validPoints[0].latitude]
        ];
        const poly = polygon([coordinates]);
        setCalculatedArea(area(poly));
      } else {
        setCalculatedArea(null);
      }
    } catch (error) {
      console.error('Area calculation error:', error);
      setCalculatedArea(null);
    }
  }, [points]);

  useEffect(() => {
    if (!mapRef.current) return;
    console.log("Map reference initialized:", mapRef.current);
  }, []);
  

  // Reset functionality
  const resetPoints = useCallback(() => {
    setPoints([]);
    setDrawnPolygons([]);  // Clear saved polygons
    setCalculatedArea(null);
  }, []);

  // 3D toggle
  const handleToggle3D = useCallback(() => {
    setIs3D(prev => {
      const newState = !prev;
      setViewport(v => ({
        ...v,
        pitch: newState ? 60 : 0,
        bearing: newState ? 30 : 0
      }));
      return newState;
    });
  }, []);

  // Line data generation
  const lineData = points.length > 1 && lineString([
    ...points.map(p => [p.longitude, p.latitude]),
    ...(points.length > 2 ? [[points[0].longitude, points[0].latitude]] : [])
  ]);
  

const renderReportContent = (data, title) => (
    <>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>{title}</h2>
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {data.message && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#856404'
          }}>
            {data.message}
          </div>
        )}
        {Object.entries(data).map(([key, value]) => (
          key !== "message" && (
            <div key={key} style={{
              marginBottom: '12px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '4px'
              }}>
                {key}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                {value || 'N/A'}
              </div>
            </div>
          )
        ))}
      </div>
    </>
  );
  

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '320px',
        minWidth: '280px'
      }}>
       {selectedReport ? ((zoningReport && renderReportContent(zoningReport, "Zoning Report") ||
        (propertyDetails && renderReportContent(propertyDetails, "Property Details") ))
       
    ) : (
      (zoningReport || propertyDetails) ? (
        <>
        <div style={{
          padding: "12px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          textAlign: "center",
          fontSize: "16px",
          fontWeight: "bold",
          color: "#333"
        }}>
          📍 Click on the marked areas to view the {zoningReport? "zoning report" : "property details"}
        </div>
        <button
        onClick={handleToggle3D}
        style={{
          flex: 1,
          padding: '8px 12px',
          backgroundColor: is3D ? '#2196F3' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '500',
          marginLeft: '7rem'
        }}
      >
        {is3D ? 'Switch to 2D' : 'Switch to 3D'}
      </button>
      </>
      )
      : (
    <>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
        Area Calculator
      </h2>
        {/* Control Buttons */}
        <div style={{ 
  display: 'flex', 
  gap: '8px', 
  marginBottom: '16px'
}}>
  <button
    onClick={handleToggle3D}
    style={{
      flex: 1,
      padding: '8px 12px',
      backgroundColor: is3D ? '#2196F3' : '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500'
    }}
  >
    {is3D ? 'Switch to 2D' : 'Switch to 3D'}
  </button>
  
  {/* Always show reset button */}
  <button 
    onClick={resetPoints}
    style={{
      padding: '8px 12px',
      backgroundColor: '#ff4444',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    Reset All
  </button>

  {/* Show save button only when drawing */}
  {points.length > 0 && (
    <button
      onClick={savePolygon}
      style={{
        padding: '8px 12px',
        backgroundColor: '#088',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Save Plotting
    </button>
  )}
</div>

        {/* Area Display */}
        {calculatedArea && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '14px',
              color: '#666'
            }}>
              CALCULATED AREA
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '8px'
            }}>
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6c757d',
                  marginBottom: '4px'
                }}>
                  Square Meters
                </div>
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  {calculatedArea.toFixed(2)} m²
                </div>
              </div>
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '12px',
                  color: '#6c757d',
                  marginBottom: '4px'
                }}>
                  Square Feet
                </div>
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2c3e50'
                }}>
                  {(calculatedArea * 10.7639).toFixed(2)} ft²
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coordinates List */}
        {points.length > 0 && (
          <div style={{ 
            maxHeight: '200px',
            overflowY: 'auto',
            borderTop: '1px solid #eee',
            paddingTop: '16px'
          }}>
            <h3 style={{ 
              margin: '0 0 8px 0',
              fontSize: '14px',
              color: '#666'
            }}>
              COORDINATES
            </h3>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '8px'
            }}>
              {points.map((point, index) => (
                <div 
                  key={index}
                  style={{ 
                    backgroundColor: '#f8f9fa',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ 
                    color: '#6c757d',
                    marginBottom: '4px'
                  }}>
                    Point {index + 1}
                  </div>
                  <div style={{ color: '#495057' }}>
                    {point.latitude.toFixed(6)}
                  </div>
                  <div style={{ color: '#495057' }}>
                    {point.longitude.toFixed(6)}
                  </div>
                </div>
              ))}
            </div>
          </div>
    
           
        )}
        </>
        ))}
      </div>

      {/* Map Component */}
      <ReactMapGL
        ref={mapRef}
        {...viewport}
        width="100%"
        height="100%"
        mapboxAccessToken="pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ"
        mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
        onMove={(evt) => setViewport(evt.viewState)}
        onClick={handleMapClick}
        interactiveLayerIds={['building', 'building-footprint', 'building-outline']}
      >
       {drawnPolygons.map((polygonCoords, index) => (
    <Source
      key={`saved-${index}`}
      type="geojson"
      data={{
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [polygonCoords]
        }
      }}
    >
      <Layer
        type="fill"
        paint={{
          "fill-color": "#f00",
          "fill-opacity": 0.4
        }}
      />
    </Source>
  ))}

  {/* Render current working polygon */}
  {points.length >= 3 && (
    <Source
      type="geojson"
      data={{
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              ...points.map(p => [p.longitude, p.latitude]),
              [points[0].longitude, points[0].latitude] // Close the polygon
            ]
          ]
        }
      }}
    >
      <Layer
        type="fill"
        paint={{
          "fill-color": "#f00",
          "fill-opacity": 0.4
        }}
      />
    </Source>
  )}
        {/* Connection Lines */}
        {lineData && (
          <Source type="geojson" data={lineData}>
            <Layer
              id="polygon-line"
              type="line"
              paint={{
                'line-color': '#ff4757',
                'line-width': 2,
                'line-dasharray': [2, 2],
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}
            {(zoningReport || propertyDetails) && zoningAreas.map(area => (
  <Source key={area.id} type="geojson" data={{ type: "Feature", geometry: { type: "Polygon", coordinates: [area.coordinates] } }}>
    <Layer
      type="fill"
      paint={{ "fill-color": area.color, "fill-opacity": 0.5 }}
      onClick={() => setSelectedReport(area.report)}
    />
  </Source>
))}
        {/* Markers */}
        {points.map((point, index) => (
          <Marker
            key={`marker-${index}`}
            longitude={point.longitude}
            latitude={point.latitude}
            draggable
            onDragStart={() => mapRef.current.getMap().dragPan.disable()}
            onDragEnd={({ lngLat }) => {
                if (!lngLat) return;
                mapRef.current.getMap().dragPan.enable();
                handleMarkerDrag(index, lngLat);
              }}
          >
            <div style={{
              position: 'relative',
              width: '12px',
              height: '12px',
              cursor: 'move'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#ff4757',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                animation: 'pulse 1.5s infinite'
              }} />
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#ffffff',
                color: '#2d3436',
                fontSize: '10px',
                fontWeight: '700',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                {index + 1}
              </div>
            </div>
          </Marker>
        ))}
      </ReactMapGL>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;