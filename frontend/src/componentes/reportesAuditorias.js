import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL;

const meses = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export default function ReportesAuditorias({ modo = "auditor", logout }) {
  const [reportes, setReportes] = useState([]);
  const [anios, setAnios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const esAdmin = modo === "admin";

  useEffect(() => {
    if (esAdmin) {
      cargarEmpresas();
    }

    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/empresas`, {
        headers: { Authorization: `Bearer ${token}` },
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
      setError("No se pudieron cargar las empresas.");
    }
  };

  const cargarReportes = async (filtros = {}) => {
    try {
      setLoading(true);
      setError("");

      const empresaSeleccionada =
        filtros.empresaFiltro !== undefined ? filtros.empresaFiltro : empresaFiltro;
      const anioSeleccionado =
        filtros.anioFiltro !== undefined ? filtros.anioFiltro : anioFiltro;

      const params = new URLSearchParams();

      if (empresaSeleccionada) params.append("empresa_id", empresaSeleccionada);
      if (anioSeleccionado) params.append("anio", anioSeleccionado);

      const url = params.toString()
        ? `${API_URL}/api/auditorias/reportes?${params.toString()}`
        : `${API_URL}/api/auditorias/reportes`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setReportes(data.reportes || []);
        setAnios(data.anios || []);
      } else {
        setError(data.message || "No se pudieron cargar los reportes.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    cargarReportes();
  };

  const limpiarFiltros = () => {
    const anioActual = new Date().getFullYear().toString();

    setEmpresaFiltro("");
    setAnioFiltro(anioActual);
    cargarReportes({ empresaFiltro: "", anioFiltro: anioActual });
  };

  const grupos = useMemo(() => {
    const agrupados = reportes.reduce((acc, item) => {
      const key = esAdmin ? item.empresa_id : "mis-auditorias";
      const nombre = esAdmin ? item.empresa_nombre : "Mis auditorías";

      if (!acc[key]) {
        acc[key] = {
          id: key,
          nombre,
          meses: Array.from({ length: 12 }, (_, index) => ({
            mes: index + 1,
            promedio: 0,
            promedioBase: 0,
            cantidad: 0,
            descuento: 0,
            reclamos: 0,
          })),
        };
      }

      acc[key].meses[item.mes - 1] = {
        mes: item.mes,
        promedio: Number(item.promedio || 0),
        promedioBase: Number(item.promedio_base || item.promedio || 0),
        cantidad: Number(item.cantidad_auditorias || 0),
        descuento: Number(item.descuento_reclamos_total || 0),
        reclamos: Number(item.cantidad_reclamos || 0),
      };

      return acc;
    }, {});

    return Object.values(agrupados);
  }, [reportes, esAdmin]);

  const resumen = useMemo(() => {
    const cantidad = reportes.reduce(
      (acc, item) => acc + Number(item.cantidad_auditorias || 0),
      0
    );
    const ponderado = reportes.reduce(
      (acc, item) =>
        acc + Number(item.promedio || 0) * Number(item.cantidad_auditorias || 0),
      0
    );
    const promedio = cantidad > 0 ? Math.round(ponderado / cantidad) : 0;
    const descuento = reportes.reduce(
      (acc, item) => acc + Number(item.descuento_reclamos_total || 0),
      0
    );
    const reclamos = reportes.reduce(
      (acc, item) => acc + Number(item.cantidad_reclamos || 0),
      0
    );

    return { cantidad, promedio, descuento, reclamos };
  }, [reportes]);

  const descargarReporte = () => {
    const encabezados = [
      "Empresa",
      "Año",
      "Mes",
      "Auditorías",
      "Promedio final",
      "Promedio base",
      "Reclamos/informes",
      "Descuento",
    ];
    const filas = reportes.map((item) => [
      item.empresa_nombre || "Mis auditorías",
      item.anio,
      meses[(Number(item.mes) || 1) - 1],
      item.cantidad_auditorias,
      item.promedio,
      item.promedio_base,
      item.cantidad_reclamos,
      item.descuento_reclamos_total,
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) =>
        fila.map((valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-auditorias-${anioFiltro || "todos"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-wrapper">
      <h2>Reportes de auditorías</h2>
      <p>
        Promedios mensuales por año basados en el porcentaje final ponderado de
        cada auditoría.
      </p>

      <div className="filters-card reports-filters">
        {esAdmin && (
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
        )}

        <select value={anioFiltro} onChange={(e) => setAnioFiltro(e.target.value)}>
          <option value="">Todos los años</option>

          {anios.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>

        <button onClick={aplicarFiltros}>Actualizar reporte</button>

        <button className="btn-secundario" onClick={limpiarFiltros}>
          Limpiar
        </button>

        <button
          className="btn-secundario"
          onClick={descargarReporte}
          disabled={reportes.length === 0}
        >
          Descargar reporte
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <span>Auditorías consideradas</span>
          <strong>{resumen.cantidad}</strong>
        </div>

        <div className="report-summary-card">
          <span>Promedio anual</span>
          <strong>{resumen.promedio}%</strong>
        </div>

        <div className="report-summary-card">
          <span>Reclamos / informes</span>
          <strong>{resumen.reclamos}</strong>
        </div>

        <div className="report-summary-card">
          <span>Descuento aplicado</span>
          <strong>-{Math.round(resumen.descuento)} pts</strong>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>Cargando reportes...</h3>
        </div>
      ) : grupos.length === 0 ? (
        <div className="empty-state">
          <h3>No hay datos para reportar</h3>
          <p>
            Todavía no hay auditorías finalizadas con respuestas para los
            filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="reports-grid">
          {grupos.map((grupo) => (
            <section className="report-card" key={grupo.id}>
              <div className="report-card-header">
                <h3>{grupo.nombre}</h3>
                <span>{anioFiltro || "Todos los años"}</span>
              </div>

              <div className="bar-chart" aria-label={`Reporte de ${grupo.nombre}`}>
                {grupo.meses.map((item, index) => (
                  <div className="bar-column" key={item.mes}>
                    <div className="bar-value">
                      {item.cantidad > 0 ? `${Math.round(item.promedio)}%` : "-"}
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ height: `${item.cantidad > 0 ? item.promedio : 0}%` }}
                      ></div>
                    </div>
                    <div className="bar-label">{meses[index]}</div>
                    <div className="bar-count">{item.cantidad}</div>
                  </div>
                ))}
              </div>

              <div className="report-legend">
                <span>Altura: promedio mensual final</span>
                <span>Número inferior: auditorías del mes</span>
                <span>Incluye descuentos por reclamos/informes</span>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
