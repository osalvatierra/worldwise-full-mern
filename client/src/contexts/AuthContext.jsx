import { createContext, useContext, useReducer } from "react";

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "Login":
      return { ...state, user: action.payload, isAuthenticated: true };
    case "Logout":
      return { ...state, user: null, isAuthenticated: false };
    default:
      throw new Error("Unknown action");
  }
}

function AuthProvider({ children }) {
  const [{ user, isAuthenticated }, dispatch] = useReducer(
    reducer,
    initialState
  );

  async function login(email, password) {
    try {
      const response = await fetch(
        "https://worldwise-full-mern-server.onrender.com/api/login",
        {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();

      console.log(data);

      if (data.success) {
        console.log(isAuthenticated);
        dispatch({ type: "Login", payload: data });
      } else {
        alert("Please check your username and password ");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  function logout() {
    dispatch({ type: "Logout" });
    // Clear the cookie on the client-side
    document.cookie =
      "xaccesstoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("AuthContext was use outside AuthProvider");
  return context;
}

export { AuthProvider, useAuth };
