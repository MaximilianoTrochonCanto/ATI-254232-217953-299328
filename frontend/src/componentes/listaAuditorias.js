import { useEffect, useState } from "react";
import DetalleAuditoria from "./detalleAuditoria";

export default function ListaAuditorias({ modo = "auditor", logout }) {
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    cargarEmpresas();
    cargarAuditorias();
  }, []);

  const cargarEmpresas = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/empresas", {
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
        setEmpresas(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const cargarAuditorias = async () => {
    try {
      setLoading(true);

      const endpoint =
        modo === "admin"
          ? "http://localhost:3001/api/auditorias/todas"
          : "http://localhost:3001/api/auditorias/mias";

      const params = new URLSearchParams();

      if (empresaFiltro) {
        params.append("empresa_id", empresaFiltro);
      }

      if (fechaDesde) {
        params.append("fecha_desde", fechaDesde);
      }

      if (fechaHasta) {
        params.append("fecha_hasta", fechaHasta);
      }

      const url = params.toString()
        ? `${endpoint}?${params.toString()}`
        : endpoint;

      const res = await fetch(url, {
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

  const aplicarFiltros = () => {
    cargarAuditorias();
  };

  const limpiarFiltros = async () => {
  setEmpresaFiltro("");
  setFechaDesde("");
  setFechaHasta("");

  try {
    setLoading(true);

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
<div className="filters-card">
  <select
    value={empresaFiltro}
    onChange={(e) => setEmpresaFiltro(e.target.value)}
  >
    <option value="">Todas las empresas</option>

    {empresas.map((empresa) => (
      <option key={empresa.id} value={empresa.id}>
        {empresa.nombre}
      </option>
    ))}
  </select>

  <input
    type="date"
    value={fechaDesde}
    onChange={(e) => setFechaDesde(e.target.value)}
  />

  <input
    type="date"
    value={fechaHasta}
    onChange={(e) => setFechaHasta(e.target.value)}
  />

  <button onClick={aplicarFiltros}>
    Aplicar filtros
  </button>

  <button className="btn-secundario" onClick={limpiarFiltros}>
    Limpiar
  </button>
</div>
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
