import MapComponent from './MapComponent';


const PropertyDetails = () => {


  const propertyDetails = {
    "Survey Number & Subpart": "13/2",
    "Address": "VILLAGE JUCHANDRA, TALUKA VASAI, DISTRICT PALGHAR.",
    "Owner Name:": "The names comes here",
    "BA number": "Number",
    "Total Area": "2100.00 Sq Mtrs",
    "Land Class": 1,
    "Property Situated in": "Residential cum Agriculture (For more details View Zoning report)",
    "Classification Of locality": "Middle class"
  };

  

  return (
    <MapComponent 
      propertyDetails={propertyDetails}
     
    />
  );
};

export default PropertyDetails;