import { useEffect, useState } from "react";

export default function PendingUsers() {
  const [users, setUsers] = useState([]);

  const token = localStorage.getItem("token");

  
  const cargarPendientes = async () => {
    const res = await fetch("http://localhost:3001/api/admin/pendientes", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const aprobar = async (id) => {
    await fetch(`http://localhost:3001/api/admin/aprobar/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    cargarPendientes();
  };

  const rechazar = async (id) => {
    await fetch(`http://localhost:3001/api/admin/rechazar/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    cargarPendientes();
  };

  return (
    <div>
      <h2>Solicitudes Pendientes</h2>

      {users.map((u) => (
        <div key={u.id}>
          <p>{u.nombre} - {u.email}</p>

          <button onClick={() => aprobar(u.id)}>
            Aprobar
          </button>

          <button onClick={() => rechazar(u.id)}>
            Rechazar
          </button>
        </div>
      ))}
    </div>
  );
}