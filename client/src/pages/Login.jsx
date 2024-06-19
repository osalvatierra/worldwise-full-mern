import { useEffect, useState } from "react";
import PageNav from "../components/PageNav";
import styles from "./Login.module.css";
import { useAuth } from "../contexts/AuthContext";
import { useCities } from "../contexts/CitiesContext"; // Import useCities hook

import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function Login() {
  // PRE-FILL FOR DEV PURPOSES
  const { login, isAuthenticated } = useAuth();
  const { fetchCities } = useCities(); // Use fetchCities function from CitiesContext

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSumbit(e) {
    e.preventDefault();
    if (email && password) login(email, password);
  }

  const navigate = useNavigate();
  useEffect(() => {
    if (isAuthenticated) {
      fetchCities(); // Call fetchCities function upon successful login
      navigate("/app/cities", { replace: true });
    }
  }, [isAuthenticated, navigate, fetchCities]);

  return (
    <main className={styles.login}>
      <PageNav />
      <form className={styles.form} onSubmit={handleSumbit}>
        <div className={styles.row}>
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>

        <div className={styles.row}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
        </div>

        <div>
          <Button type="primary">Login</Button>
        </div>
      </form>
    </main>
  );
}
