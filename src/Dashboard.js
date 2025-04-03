import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="grid-container">
        
        <Link to="/zoning-report" className="dashboard-card">
          <div className="card-header zoning">Zoning Report</div>
          <div className="card-content zoning">
            <p>Find out about zoning reports and their importance.</p>
          </div>
        </Link>

        <Link to="/property-details" className="dashboard-card">
          <div className="card-header property">Property Details</div>
          <div className="card-content property">
            <p>Search property information and ownership details.</p>
          </div>
        </Link>

        <Link to="/development-planning" className="dashboard-card">
          <div className="card-header planning">Development Planning</div>
          <div className="card-content planning">
            <p>Assess construction potential and parcel viability.</p>
          </div>
        </Link>

        <Link to="/market-potential" className="dashboard-card">
          <div className="card-header market">Market Potential</div>
          <div className="card-content market">
            <p>Identify investment opportunities and market trends.</p>
          </div>
        </Link>

      </div>
    </div>
  );
};

export default Dashboard;