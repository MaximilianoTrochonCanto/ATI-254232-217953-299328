import { useState } from "react";

export default function Login({ onSwitch, setRol, setToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  
  const limpiarMensajes = () => {
  setError("");
  setWarning("");
  setSuccess("");
};
  const handleLogin = async () => {
    setError("");
    setWarning("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("rol", data.user.rol);

        setToken(data.token);
        setRol(data.user.rol);

        setSuccess("Ingreso correcto.");
      } else {
        const msg = data.message || "";

        if (
          msg.toLowerCase().includes("pendiente") ||
          msg.toLowerCase().includes("rechazada") ||
          msg.toLowerCase().includes("deshabilitada")
        ) {
          setWarning(msg);
        } else {
          setError(msg);
        }
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  if (forgotMode) {
    return (
      <div className="card">
        <h2>Recuperar contraseña</h2>
        <p>Ingrese su correo electrónico.</p>

        <input
          placeholder="Correo electrónico"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
        />

        {success && <p className="success-message">{success}</p>}
        {error && <p className="error-message">{error}</p>}

        <button
          onClick={() => {
            setSuccess(
              "Si el correo existe, se enviarán instrucciones para restablecer la contraseña.",
            );
          }}
        >
          Enviar
        </button>

        <div className="switch" onClick={() => setForgotMode(false)}>
          Volver al login
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Iniciar sesión</h2>
      <p>Ingrese sus credenciales para acceder.</p>

      <input
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          limpiarMensajes()
        }}
      />

      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            limpiarMensajes()
          }}
        />

        <span
          className="toggle-password"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "🙈" : "👁"}
        </span>
      </div>
       
      {error && <p className="error-message">{error}</p>}
      {warning && <p className="warning-message">{warning}</p>}
      {success && <p className="success-message">{success}</p>}

      <button 
      onClick={() => 
      {limpiarMensajes();
        handleLogin()
        }}>Ingresar</button>

      <div className="switch" onClick={() => { 
        onSwitch(); 
        limpiarMensajes()}}>
        Solicitar cuenta nueva
      </div>
         <div className="switch"  
         onClick={() => {
          limpiarMensajes();
           setForgotMode(true)}}>
          ¿Olvidó su contraseña?
        </div>
    </div>
  );
}
