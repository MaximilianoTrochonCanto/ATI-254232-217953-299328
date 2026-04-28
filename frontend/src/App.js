import { useState } from "react";
import Login from "./componentes/login";
import Register from "./componentes/registro";
import PendingUsers from "./componentes/usuariosPendientes";
import AdminPanel from "./componentes/adminPanel";
import "./estilos.css";

function App() {
  const [isLogin, setIsLogin] = useState(true);

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [rol, setRol] = useState(localStorage.getItem("rol"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");

    setToken(null);
    setRol(null);

    setIsLogin(true);
  };

  // SI HAY SESIÓN
  if (token) {
  if (rol === "admin") {
    return <AdminPanel logout={logout} />;
  }

  if (rol === "auditor") {
    return (
      <div className="container">
        <div className="card">
          <p>Panel Auditor</p>
        </div>
      </div>
    );
  }
}

  // SI NO HAY SESIÓN
  return (
  <div className="container">
    
    <div className="left-panel">
      {isLogin ? (
        <Login
        
          onSwitch={() => setIsLogin(false)}
          setRol={setRol}
          setToken={setToken}
        />
      ) : (
        <Register
          onSwitch={() => setIsLogin(true)}
        />
      )}
    </div>

    <div
      className="right-panel"
      style={{
        backgroundImage:
          "url('/nutricion.jpg')"
      }}
    ></div>

  </div>
);
}

export default App;