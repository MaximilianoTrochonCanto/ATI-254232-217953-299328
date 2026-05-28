import { useEffect, useState } from "react";
import DetalleAuditoria from "./detalleAuditoria";

export default function ListaAuditorias({ modo = "auditor", logout }) {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    cargarAuditorias();
  }, []);

  const cargarAuditorias = async () => {
    try {
      const endpoint =
        modo === "admin"
          ? "http://localhost:3001/api/auditorias/todas"
          : "http://localhost:3001/api/auditorias/mias";

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setAuditorias(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <h3>Cargando auditorías...</h3>
      </div>
    );
  }

  if (auditorias.length === 0) {
    return (
      <div className="empty-state">
        <img src="/empty-requests.png" alt="Sin auditorías" />

        <h3>No hay auditorías registradas</h3>

        <p>Las auditorías realizadas aparecerán aquí.</p>
      </div>
    );
  }
if (auditoriaSeleccionada) {
  return (
    <DetalleAuditoria
      auditoriaId={auditoriaSeleccionada}
      volver={() => setAuditoriaSeleccionada(null)}
      logout={logout}
    />
  );
}
  return (
    <div className="audits-wrapper">
      <h2>{modo === "admin" ? "Todas las auditorías" : "Mis auditorías"}</h2>

      <div className="audits-grid">
        {auditorias.map((a) => (
          <div className="audit-card" key={a.id}>
            <div className="audit-top">
              <span className="audit-status">{a.estado}</span>
            </div>

            <h3>{a.plantilla_nombre}</h3>

            <p>
              <strong>Empresa:</strong> {a.empresa_nombre}
            </p>

            <p>
              <strong>Lugar:</strong> {a.lugar || "-"}
            </p>

            <p>
              <strong>Fecha:</strong> {new Date(a.fecha).toLocaleDateString()}
            </p>

            {modo === "admin" && (
              <p>
                <strong>Auditor:</strong> {a.usuario_nombre}
              </p>
            )}

            <button onClick={() => setAuditoriaSeleccionada(a.id)}>
              Ver auditoría
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
