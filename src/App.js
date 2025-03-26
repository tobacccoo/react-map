import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import ZoningReport from './ZoningReport';
import PropertyDetails from './PropertyDetails';
import DevelopmentPlanning from './DevelopmentPlanning';
import MarketPotential from './MarketPotential';

function App() {
  console.log("Mapbox Token:", process.env.REACT_APP_MAPBOX_TOKEN);
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/zoning-report" element={<ZoningReport />} />
        <Route path="/property-details" element={<PropertyDetails />} />
        <Route path="/development-planning" element={<DevelopmentPlanning />} />
        <Route path="/market-potential" element={<MarketPotential />} />
      </Routes>
    </Router>
  );
}

export default App;