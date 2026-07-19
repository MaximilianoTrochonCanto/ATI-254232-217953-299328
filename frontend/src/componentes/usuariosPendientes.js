import { useEffect, useState } from "react";

export default function PendingUsers({ logout, setNotificaciones }) {
  const [users, setUsers] = useState([]);
  const [usuariosActivos, setUsuariosActivos] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const limpiarMensajes = () => {
    setError("");
    setSuccess("");
  };

  const cargarPendientes = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/pendientes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        const solicitudes = Array.isArray(data) ? data : [];

        setUsers(solicitudes);
        setNotificaciones((prev) => {
          return solicitudes.map((u) => {
            const existente = prev.find((n) => n.id === u.id);

            return {
              id: u.id,
              titulo: "Nueva solicitud",
              mensaje: `${u.nombre} ${u.apellido} solicitó acceso`,
              leida: existente ? existente.leida : false,
            };
          });
        });
      } else {
        setError(data.message || "No se pudieron cargar las solicitudes.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const cargarUsuariosActivos = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/usuarios`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        setUsuariosActivos(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || "No se pudieron cargar los usuarios.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  useEffect(() => {
    cargarPendientes();
    cargarUsuariosActivos();

    const intervalo = setInterval(() => {
      cargarPendientes();
    }, 10000);

    return () => clearInterval(intervalo);
  }, []);

  const aprobar = async (id) => {
    try {
      limpiarMensajes();

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/aprobar/${id}`,
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
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
        setSuccess("Usuario aprobado correctamente.");
        cargarUsuariosActivos();
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const rechazar = async (id) => {
    try {
      limpiarMensajes();

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/rechazar/${id}`,
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
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
        setSuccess("Usuario rechazado correctamente.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const desactivarUsuario = async (id) => {
    limpiarMensajes();

    const confirmar = window.confirm("¿Seguro que desea desactivar este usuario?");

    if (!confirmar) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/desactivar/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        setUsuariosActivos((prev) => prev.filter((u) => u.id !== id));
        setSuccess(data.message || "Usuario desactivado correctamente.");
      } else {
        setError(data.message || "No se pudo desactivar el usuario.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  return (
    <div className="pending-wrapper">
      <h2>Gestión de usuarios</h2>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <section className="users-section">
        <h3>Solicitudes pendientes</h3>

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
      </section>

      <section className="users-section">
        <h3>Usuarios activos</h3>

        {usuariosActivos.length === 0 ? (
          <div className="empty-state">
            <h3>No hay usuarios activos</h3>
            <p>Los usuarios aprobados aparecerán en esta sección.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {usuariosActivos.map((u) => (
              <div className="user-card" key={u.id}>
                <h4>
                  {u.nombre} {u.apellido}
                </h4>

                <p>{u.email}</p>
                <p>Cargo: {u.titulo_trabajo || "Sin asignar"}</p>
                <p>Empresa: {u.empresa_nombre || "Sin asignar"}</p>

                <div className="user-actions">
                  <button
                    className="btn-rechazar"
                    onClick={() => desactivarUsuario(u.id)}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
