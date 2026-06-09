import { useEffect, useState } from "react";

export default function DetalleAuditoria({ auditoriaId, volver, logout }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    cargarDetalle();
  }, []);

  const cargarDetalle = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/auditorias/${auditoriaId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setDetalle(data);
      } else {
        setError(data.message || "No se pudo cargar la auditoría.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/auditorias/${auditoriaId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) {
        setError("No se pudo descargar el PDF.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `auditoria-${auditoriaId}.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError("Error al descargar el PDF.");
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <h3>Cargando auditoría...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>{error}</h3>
        <button onClick={volver}>Volver</button>
      </div>
    );
  }

  const auditoria = detalle.auditoria;
  const respuestas = detalle.respuestas;

  const puntajeObtenido = respuestas.reduce(
    (acc, r) => acc + (r.puntuacion || 0),
    0,
  );

  const puntajeMaximo = respuestas.reduce((acc, r) => {
    if (r.no_verificable) return acc;
    return acc + (r.puntaje_maximo || 2);
  }, 0);

  const porcentaje =
    puntajeMaximo > 0 ? Math.round((puntajeObtenido / puntajeMaximo) * 100) : 0;

  return (
    <div className="detalle-auditoria-wrapper">
      <button className="back-button" onClick={volver}>
        ←
      </button>

      <h2>{auditoria.plantilla_nombre}</h2>

      <div className="audit-summary">
        <div className="summary-item">
          <span>Empresa</span>
          <strong>{auditoria.empresa_nombre}</strong>
        </div>

        <div className="summary-item">
          <span>Lugar</span>
          <strong>{auditoria.lugar || "-"}</strong>
        </div>

        <div className="summary-item">
          <span>Fecha</span>
          <strong>{new Date(auditoria.fecha).toLocaleDateString()}</strong>
        </div>

        <div className="summary-item">
          <span>Estado</span>
          <strong>{auditoria.estado}</strong>
        </div>

        <div className="summary-item score">
          <span>Resultado</span>
          <strong>{porcentaje}%</strong>
        </div>
      </div>

      <div className="respuestas-list">
        {respuestas.map((r) => (
          <div className="respuesta-card" key={r.id}>
            <h4>
              {r.numero}. {r.texto}
            </h4>

            <p className="respuesta-seccion">{r.seccion}</p>

            <p>
              <strong>Puntuación:</strong>{" "}
              {r.no_verificable ? "No verificable" : r.puntuacion}
            </p>

            <p>
              <strong>Observación:</strong>{" "}
              {r.observacion || "Sin observaciones"}
            </p>            
          </div>          
        ))}
      </div>
      <button className="new-audit-button" onClick={descargarPDF}>
            Descargar PDF
            </button>
    </div>
  );
}
