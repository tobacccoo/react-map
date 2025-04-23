import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMapGL, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import { area } from '@turf/area';
import { polygon, lineString } from '@turf/helpers';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';

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
    name: "Commercial Zone",
    color: "#ff5733",
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
    name: "Residential Zone",
    color: "#ff5733",
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
    color: "#ffcc00",
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
    color: "#3366ff",
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [buildingHeight, setBuildingHeight] = useState(10);

const createExtrusionGeoJSON = (coordinates) => {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    },
    properties: {
      height: buildingHeight
    }
  };
};

const generateBuildingGeometry = (coordinates, height = buildingHeight) => {
  if (!coordinates || coordinates.length < 3) return null;
  
  // Convert coordinates to Three.js vertices
  const vertices = coordinates.map(coord => [
    coord[0], // longitude
    coord[1], // latitude
    0 // base elevation
  ]);
  
  // Close the polygon by repeating the first point
  vertices.push([...vertices[0]]);
  
  // Create walls
  const walls = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    const p1 = vertices[i];
    const p2 = vertices[i+1];
    
    walls.push(
      // Bottom edge
      [p1[0], p1[1], p1[2]],
      [p2[0], p2[1], p2[2]],
      // Top edge
      [p2[0], p2[1], height],
      [p1[0], p1[1], height]
    );
  }
  
  // Create roof (flat)
  const roof = vertices.map(p => [p[0], p[1], height]);
  
  return { vertices, walls, roof };
};

// Component for rendering a 3D building
const Building = ({ coordinates, height, color = '#cccccc' }) => {
  const geometry = generateBuildingGeometry(coordinates, height);
  
  if (!geometry) return null;
  
  return (
    <group>
      {/* Walls */}
      {geometry.walls.map((wall, i) => (
        <Line
          key={`wall-${i}`}
          points={wall}
          color={color}
          lineWidth={2}
        />
      ))}
      
      {/* Roof */}
      <Line
        points={geometry.roof}
        color={color}
        lineWidth={2}
        closed
      />
      
      {/* Vertical edges */}
      {geometry.vertices.map((vertex, i) => (
        <Line
          key={`edge-${i}`}
          points={[
            [vertex[0], vertex[1], 0],
            [vertex[0], vertex[1], height]
          ]}
          color={color}
          lineWidth={2}
        />
      ))}
    </group>
  )
}



  const savePolygon = () => {
    if (points.length < 3) {
      console.warn("Polygon must have at least 3 points.");
      return;
    }
    
    // Create a new polygon object with coordinates and calculated area
    const newPolygon = {
      id: `polygon-${Date.now()}`,
      coordinates: points.map(p => [p.longitude, p.latitude]),
      area: calculatedArea
    };
    
    // Add to drawn polygons and reset current points
    setDrawnPolygons(prev => [...prev, newPolygon]);
    setPoints([]);
    setCalculatedArea(null);
  };


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

  const deletePolygon = (polygonId) => {
    setDrawnPolygons(prev => prev.filter(poly => poly.id !== polygonId));
    setSelectedPolygon(null); // Close the info panel after deletion
  };

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

  const handleMapClick = useCallback((event) => {
    if (!event || !event.lngLat || isNaN(event.lngLat.lng) || isNaN(event.lngLat.lat)) {
      console.error("Invalid map click event:", event);
      return;
    }
  
    const { lngLat } = event;
    if (!lngLat) return;
  
    // Check if clicked inside a zoning area (only in zoning/property mode)
    if (zoningReport || propertyDetails) {
      const clickedZone = zoningAreas.find((zone) =>
        insidePolygon(lngLat, zone.coordinates)
      );
    
      if (clickedZone) {
        setSelectedReport(clickedZone.report);
        setSelectedPolygon(null);
        return;
      }
    }
  
    // Check if clicked inside a drawn polygon (only in development mode)
    if (!zoningReport && !propertyDetails) {
      const clickedPolygon = drawnPolygons.find(polygon => 
        insidePolygon(lngLat, polygon.coordinates)
      );
      
      if (clickedPolygon) {
        setSelectedPolygon(clickedPolygon);
        setSelectedReport(null);
        return;
      }
      
      // If not clicking a polygon, add a new marker
      setPoints(prev => [...prev, { longitude: lngLat.lng, latitude: lngLat.lat }]);
    }
  }, [zoningAreas, zoningReport, propertyDetails, drawnPolygons]);

  useEffect(() => {
    if (zoningReport || propertyDetails) {
      setSelectedReport(null);
      setSelectedPolygon(null);
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

  const resetPoints = useCallback(() => {
    setPoints([]);
    setDrawnPolygons([]);
    setCalculatedArea(null);
    setSelectedPolygon(null);
  }, []);

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

  const renderPolygonInfo = (polygon) => {
    if (!polygon) return null;
    
    return (
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '320px',
        minWidth: '280px'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
          Saved Polygon Details
        </h2>
       
        
           <div style={{ marginBottom: '16px' }}>
           
             <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '5px' 
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '14px',
                  color: '#666' 
                }}>
                  AREA
                </h3>
                <button
                  onClick={() => deletePolygon(polygon.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Delete Area
                </button>
              </div>
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
                {polygon.area.toFixed(2)} m²
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
                {(polygon.area * 10.7639).toFixed(2)} ft²
              </div>
            </div>
          </div>
        </div>

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
            {polygon.coordinates.map((coord, index) => (
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
                  {coord[1].toFixed(6)}
                </div>
                <div style={{ color: '#495057' }}>
                  {coord[0].toFixed(6)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleSearchChange = async (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${"pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ"}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  // Handle location selection
  const handleLocationSelect = (place) => {
    const [longitude, latitude] = place.center;

    setViewport((prev) => ({
      ...prev,
      latitude,
      longitude,
      zoom: 15
    }));

    setSearchQuery(place.place_name);
    setSearchResults([]);
  };



  return (
    
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Control Panel */}

      <div style={{
  position: 'absolute',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)', // Center horizontally
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
      width:'93%',
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
{!zoningReport && !propertyDetails && points.length >= 3 && (
  <div style={{
    position: 'absolute',
    bottom: '200px',
    left: 20,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxWidth: '320px',
    minWidth: '280px'
  }}>
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ 
        margin: '0 0 8px 0', 
        fontSize: '14px',
        color: '#666'
      }}>
        BUILDING HEIGHT
      </h3>
      <input
        type="range"
        min="1"
        max="100"
        value={buildingHeight}
        onChange={(e) => setBuildingHeight(parseInt(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#6c757d'
      }}>
        <span>1m</span>
        <span>{buildingHeight}m</span>
        <span>100m</span>
      </div>
    </div>
  
  </div>
)}
     
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
        
              {selectedReport ? (
          zoningReport 
            ? renderReportContent(zoningReport, "Zoning Report") 
            : propertyDetails 
              ? renderReportContent(propertyDetails, "Property Details") 
              : null
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
          ) : (
            <>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
                Area Calculator
              </h2>
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
          )
        )}
      </div>

      {/* Polygon Info Panel (right side) */}
      {selectedPolygon && renderPolygonInfo(selectedPolygon)}

      {/* Map Component */}
      <ReactMapGL
        ref={mapRef}
        {...viewport}
        width="100%"
        height="100%"
        mapboxAccessToken="pk.eyJ1Ijoic2FyaW1zcyIsImEiOiJjbThvNnRmNHUwODBrMnByMHpsMHMzZGE0In0.eE5PcxlDMTLsfuL6XhupHQ"
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onMove={(evt) => setViewport(evt.viewState)}
        onClick={handleMapClick}
        interactiveLayerIds={['building', 'building-footprint', 'building-outline']}
      >
        {/* Render saved polygons */}
        {points.length >= 3 && (
          <Source
            type="geojson"
            data={createExtrusionGeoJSON([
              ...points.map(p => [p.longitude, p.latitude]),
              [points[0].longitude, points[0].latitude]
            ])}
          >
            <Layer
              id="current-building"
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': '#ff4757',
                'fill-extrusion-height': buildingHeight,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.8
              }}
              
            />
          </Source>
        )}



        {/* Saved polygons as buildings */}
        {drawnPolygons.map((polygon) => (
          <Source
            key={`building-${polygon.id}`}
            type="geojson"
            data={createExtrusionGeoJSON(polygon.coordinates)}
          >
            <Layer
              id={`saved-building-${polygon.id}`}
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': '#3366ff',
                'fill-extrusion-height': buildingHeight,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.8
              }}
            />
          </Source>
        ))}





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

        {/* Zoning Areas */}
        {(zoningReport || propertyDetails) && zoningAreas.map(area => (
          <Source key={area.id} type="geojson" data={{ 
            type: "Feature", 
            geometry: { 
              type: "Polygon", 
              coordinates: [area.coordinates] 
            } 
          }}>
            <Layer
              type="fill"
              paint={{ 
                "fill-color": area.color, 
                "fill-opacity": 0.5 
              }}
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
         {points.length >= 3 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}>
            <Canvas
              camera={{
                position: [0, 0, 1000],
                fov: 75,
                near: 0.1,
                far: 10000
              }}
              style={{ pointerEvents: 'none' }}
            >
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              
              {/* Current building being drawn */}
              <Building 
                coordinates={points.map(p => [p.longitude, p.latitude])}
                height={buildingHeight}
                color="#ff4757"
              />
              
              {/* Saved buildings */}
              {drawnPolygons.map(polygon => (
                <Building
                  key={polygon.id}
                  coordinates={polygon.coordinates}
                  height={buildingHeight}
                  color="#00f"
                />
              ))}
              
              <OrbitControls 
                enableZoom={false}
                enablePan={false}
                enableRotate={false}
              />
            </Canvas>
          </div>
        )}
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