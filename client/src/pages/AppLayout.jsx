import { useParams, useLocation } from "react-router-dom";
import { useCities } from "../contexts/CitiesContext";

import Sidebar from "../components/Sidebar";
import Map from "../components/Map";
import styles from "./AppLayout.module.css";
import User from "../components/User";

function AppLayout() {
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const lat = queryParams.get("lat");
  const lng = queryParams.get("lng");

  console.log("Testing presence of lat: " + lat);
  //
  const validLat = lat !== null ? parseFloat(lat) : null;
  const validLng = lng !== null ? parseFloat(lng) : null;

  const { cities } = useCities();

  console.log(queryParams);
  return (
    <div className={styles.app}>
      <Sidebar />
      <Map
        cities={cities}
        cityId={parseInt(id)}
        lat={validLat}
        lng={validLng}
      />
      <User />
    </div>
  );
}

export default AppLayout;
