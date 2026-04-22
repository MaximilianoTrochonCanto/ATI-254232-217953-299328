import { useState } from "react";

export default function Register({ onSwitch }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Usuario creado 🎉");
        onSwitch();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="card">
      <h2>Registro</h2>
      <input placeholder="Nombre" onChange={(e) => setNombre(e.target.value)} />
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleRegister}>Registrarse</button>
      <div className="switch" onClick={onSwitch}>
        Ya tengo cuenta
      </div>
    </div>
  );
}