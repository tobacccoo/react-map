import React from "react";
import MapComponent from "./MapComponent";

const ZoningReport = () => {
   const zoningReport = {
      "1. Uses Allowed": "",
      "2.Buildable Area by FAR": "",
      "3.Approximate Buildable Area": "",
      "4.Building Height": "",
      "5.FAR": "",
      "6.Interior Side Setback": "",
      "7. Lot area": "",        
      "8. Living unit Density": "",
      "9. Max Units Allowed": "",
      "10. Parking spaces Hotel": "",
      "11. Parking spaces Industrial": "",
      "12. Parking spaces office": "",
      "13.  Parking spaces residential": "",  
      "14.  Parking spaces Retail": "",      
      "15. Parking Spaces Single Family": "",
      "16. Primary Setback": "",
      "17. Rear Set back": "",   
      "18. Side street Setback": "",
      "19. Zoning Distric": ""    
    };
    return (
     
       <MapComponent zoningReport={zoningReport}/>

    );
  };
  
  export default ZoningReport;