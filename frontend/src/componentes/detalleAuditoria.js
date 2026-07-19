import { useEffect, useState } from "react";

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const partes = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (partes) return `${partes[3]}/${partes[2]}/${partes[1]}`;
  return new Date(fecha).toLocaleDateString("es-UY");
};

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
        `${process.env.REACT_APP_API_URL}/api/auditorias/${auditoriaId}`,
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
        `${process.env.REACT_APP_API_URL}/api/auditorias/${auditoriaId}/pdf`,
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

  const descargarDOCX = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/${auditoriaId}/docx`,
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
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
          ? await res.json().catch(() => null)
          : null;
        setError(
          data?.message ||
            (res.status === 404
              ? "La descarga DOCX todavía no está disponible en el servidor."
              : "No se pudo descargar el DOCX."),
        );
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `auditoria-${auditoriaId}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError("Error al descargar el DOCX.");
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
  const reclamos = detalle.reclamos || [];

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
  const descuentoReclamos = reclamos.reduce(
    (acc, reclamo) => acc + (Number(reclamo.descuento_puntaje) || 0),
    0,
  );
  const puntaje = detalle.puntaje || {
    porcentajeBase: porcentaje,
    descuentoReclamos,
    porcentajeFinal: Math.max(0, Math.round(porcentaje - descuentoReclamos)),
  };

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
          <strong>{formatearFecha(auditoria.fecha)}</strong>
        </div>

        <div className="summary-item">
          <span>Estado</span>
          <strong>{auditoria.estado}</strong>
        </div>

        <div className="summary-item score">
          <span>Resultado final</span>
          <strong>{puntaje.porcentajeFinal}%</strong>
        </div>

        <div className="summary-item">
          <span>Resultado base</span>
          <strong>{puntaje.porcentajeBase}%</strong>
        </div>

        <div className="summary-item">
          <span>Descuento reclamos/informes</span>
          <strong>-{puntaje.descuentoReclamos} pts</strong>
        </div>
      </div>

      {reclamos.length > 0 && (
        <div className="respuestas-list">
          <h3>Reclamos / informes vinculados</h3>

          {reclamos.map((reclamo) => (
            <div className="respuesta-card" key={reclamo.id}>
              <h4>{reclamo.titulo}</h4>

              <p>
                <strong>Gravedad:</strong> {reclamo.gravedad || "-"}
              </p>

              <p>
                <strong>Estado:</strong> {reclamo.estado || "-"}
              </p>

              <p>
                <strong>Descuento aplicado:</strong>{" "}
                -{Number(reclamo.descuento_puntaje) || 0} pts
              </p>

              <p>{reclamo.descripcion}</p>
            </div>
          ))}
        </div>
      )}

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
      <button className="new-audit-button" onClick={descargarDOCX}>
        Descargar DOCX editable
      </button>
    </div>
  );
}
