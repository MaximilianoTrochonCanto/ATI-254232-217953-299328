import { useEffect, useState } from "react";

export default function PendingUsers({ logout, setNotificaciones }) {
  const [users, setUsers] = useState([]);

  const token = localStorage.getItem("token");

  const cargarPendientes = async () => {
    const res = await fetch("http://localhost:3001/api/admin/pendientes", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.status === 401) {
      logout();
      return;
    }

    setUsers(data);
    setNotificaciones((prev) => {
      return data.map((u) => {
        const existente = prev.find((n) => n.id === u.id);

        return {
          id: u.id,
          titulo: "Nueva solicitud",
          mensaje: `${u.nombre} ${u.apellido} solicitó acceso`,
          leida: existente ? existente.leida : false,
        };
      });
    });
  };

  useEffect(() => {
    cargarPendientes();

    const intervalo = setInterval(() => {
      cargarPendientes();
    }, 10000); // cada 10 segundos

    return () => clearInterval(intervalo);
  }, []);

  const aprobar = async (id) => {
  try {
    const res = await fetch(
      `http://localhost:3001/api/admin/aprobar/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 401) {
      logout();
      return;
    }

    if (res.ok) {
      setUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );

      setNotificaciones((prev) =>
        prev.filter((n) => n.id !== id)
      );
    }

  } catch (error) {
    console.error(error);
  }
};

const rechazar = async (id) => {
  try {
    const res = await fetch(
      `http://localhost:3001/api/admin/rechazar/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.status === 401) {
      logout();
      return;
    }

    if (res.ok) {
      setUsers((prev) =>
        prev.filter((u) => u.id !== id)
      );

      setNotificaciones((prev) =>
        prev.filter((n) => n.id !== id)
      );
    }

  } catch (error) {
    console.error(error);
  }
};

  return (
    <div className="pending-wrapper">
      <h2>Solicitudes Pendientes</h2>

      {users.length === 0 ? (
        <div className="empty-state">
          <img src="/empty-requests.png" alt="Sin solicitudes" />

          <h3>No hay solicitudes pendientes</h3>

          <p>Todo se encuentra actualizado.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {users.map((u) => (
            <div className="user-card" key={u.id}>
              <h4>
                {u.nombre} {u.apellido}
              </h4>

              <p>{u.email}</p>
              <p>Cargo: {u.titulo_trabajo || "Sin asignar"}</p>
              <p>Empresa: {u.empresa_nombre || "Sin asignar"}</p>

              <div className="user-actions">
                <button className="btn-aprobar" onClick={() => aprobar(u.id)}>
                  Aprobar
                </button>

                <button className="btn-rechazar" onClick={() => rechazar(u.id)}>
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
