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

  const { cities } = useCities();

  console.log(queryParams);
  return (
    <div className={styles.app}>
      <Sidebar />
      <Map
        cities={cities}
        cityId={parseInt(id)}
        lat={parseFloat(lat)}
        lng={parseFloat(lng)}
      />
      <User />
    </div>
  );
}

export default AppLayout;
