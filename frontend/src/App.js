import { useState } from "react";
import Login from "./componentes/login";
import Register from "./componentes/registro";
import AdminPanel from "./componentes/adminPanel";
import AuditorPanel from "./componentes/auditorPanel";
import ReclamoInforme from "./componentes/reclamoInforme";
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

  if (token && rol === "admin") {
    return <AdminPanel logout={logout} />;
  }

  if (token && rol === "auditor") {
    return <AuditorPanel logout={logout} />;
  }

  return (
  <div className={`container ${isLogin ? "login-layout" : "register-layout"}`}>
    <div
      className="image-panel fade-image"
      style={{
        backgroundImage: `url(${isLogin? "/nutricion.png":"nutricion.jpg"})`,
      }}
    ></div>

    <div className="form-panel">
      {isLogin ? (
        <Login
          onSwitch={() => setIsLogin(false)}
          setRol={setRol}
          setToken={setToken}
        />
      ) : (
        <Register onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  </div>
);
}

export default App;