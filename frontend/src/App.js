import { useState } from "react";
import Login from "./componentes/login";
import Register from "./componentes/registro";
import "./estilos.css";

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="container">
      {isLogin ? (
        <Login onSwitch={() => setIsLogin(false)} />
      ) : (
        <Register onSwitch={() => setIsLogin(true)} />
      )}
    </div>
  );
}

export default App;