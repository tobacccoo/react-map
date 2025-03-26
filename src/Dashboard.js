import { Link } from 'react-router-dom';
import './Dashboard.css';


const Dashboard = () => {
  return (
    <div className="dashboard-container">
     
      <div className="grid-container">
        <Link to="/zoning-report" className="dashboard-card">
          <h2>Zoning Report</h2>
          <p>Find out about zoning reports and their importance</p>
        </Link>

        <Link to="/property-details" className="dashboard-card">
          <h2>Property Details</h2>
          <p>Search property information and ownership details</p>
        </Link>

        <Link to="/development-planning" className="dashboard-card">
          <h2>Development Planning</h2>
          <p>Assess construction potential and parcel viability</p>
        </Link>

        <Link to="/market-potential" className="dashboard-card">
          <h2>Market Potential</h2>
          <p>Identify investment opportunities and market trends</p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;