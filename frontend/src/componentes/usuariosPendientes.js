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
  <div className="pending-wrapper">

    <h2>Solicitudes Pendientes</h2>

    {users.length === 0 ? (
      <div className="empty-state">
        <img
          src="/empty-requests.png"
          alt="Sin solicitudes"
        />

        <h3>No hay solicitudes pendientes</h3>

        <p>Todo se encuentra actualizado.</p>
      </div>
    ) : (
      <div className="cards-grid">
        {users.map((u) => (
          <div className="user-card" key={u.id}>
            <h4>{u.nombre} {u.apellido}</h4>

            <p>{u.email}</p>
            <p>Cargo: {u.titulo_trabajo || "Sin asignar"}</p>
            <p>Empresa: {u.empresa_nombre || "Sin asignar"}</p>

            <div className="user-actions">
              <button
                className="btn-aprobar"
                onClick={() => aprobar(u.id)}
              >
                Aprobar
              </button>

              <button
                className="btn-rechazar"
                onClick={() => rechazar(u.id)}
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
}