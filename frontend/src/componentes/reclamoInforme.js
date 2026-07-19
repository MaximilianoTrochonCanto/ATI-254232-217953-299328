import { useEffect, useMemo, useRef, useState } from "react";

const descuentosPorGravedad = {
  reclamo: 2,
  informe_observacion: 8,
  informe_no_conformidad: 15,
  baja: 2,
  media: 5,
  alta: 10,
  critica: 20,
};

const obtenerDescuentoReclamo = (reclamo) =>
  Number(reclamo.descuento_puntaje ?? descuentosPorGravedad[reclamo.gravedad]) ||
  0;

export default function ReclamoInforme({ modo = "auditor", logout }) {
  const [empresas, setEmpresas] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [reclamos, setReclamos] = useState([]);

  const [empresaId, setEmpresaId] = useState("");
  const [auditoriaId, setAuditoriaId] = useState("");
  const [servicio, setServicio] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [gravedad, setGravedad] = useState("reclamo");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const token = localStorage.getItem("token");
  const esAdmin = modo === "admin";
  const archivoInputRef = useRef(null);

  useEffect(() => {
    cargarEmpresas();
    cargarAuditorias();
    cargarReclamos();
  }, []);

  const manejarNoAutorizado = (res) => {
    if (res.status === 401 && logout) {
      logout();
      return true;
    }

    return false;
  };

  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (manejarNoAutorizado(res)) return;

      if (res.ok) {
        setEmpresas(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || "Error al cargar empresas.");
      }
    } catch (error) {
      setError("Error al cargar empresas.");
    }
  };

  const cargarAuditorias = async () => {
    try {
      const endpoint = esAdmin ? "todas" : "mias";
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auditorias/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (manejarNoAutorizado(res)) return;

      if (res.ok) {
        setAuditorias(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      setError("Error al cargar auditorías.");
    }
  };

  const cargarReclamos = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reclamos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (manejarNoAutorizado(res)) return;

      if (res.ok) {
        setReclamos(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || "Error al cargar reclamos.");
      }
    } catch (error) {
      setError("Error al cargar reclamos.");
    }
  };

  const guardarReclamo = async (e) => {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (!empresaId || !servicio || !titulo || !descripcion) {
      setError("Complete todos los campos obligatorios.");
      return;
    }

    const formData = new FormData();

    formData.append("empresa_id", empresaId);
    formData.append("auditoria_id", auditoriaId);
    formData.append("servicio", servicio);
    formData.append("titulo", titulo);
    formData.append("descripcion", descripcion);
    formData.append("gravedad", gravedad);
    formData.append("observaciones", observaciones);

    if (archivo) {
      formData.append("archivo", archivo);
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reclamos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (manejarNoAutorizado(res)) return;

      if (res.ok) {
        setMensaje("Reclamo / informe registrado correctamente.");

        setEmpresaId("");
        setAuditoriaId("");
        setServicio("");
        setTitulo("");
        setDescripcion("");
        setGravedad("reclamo");
        setObservaciones("");
        setArchivo(null);
        if (archivoInputRef.current) {
          archivoInputRef.current.value = "";
        }
        cargarReclamos();
      } else {
        setError(data.message || "No se pudo registrar el reclamo.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const abrirAdjunto = async (reclamo) => {
    setMensaje("");
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/reclamos/${reclamo.id}/adjunto`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (manejarNoAutorizado(res)) return;

      if (!res.ok) {
        setError("No se pudo abrir el adjunto.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setError("Error al abrir el adjunto.");
    }
  };

  const auditoriasFiltradas = auditorias.filter(
    (a) => Number(a.empresa_id) === Number(empresaId)
  );

  const reclamosFiltrados = useMemo(() => {
    return reclamos.filter((reclamo) => {
      const coincideEmpresa =
        !filtroEmpresa || Number(reclamo.empresa_id) === Number(filtroEmpresa);
      const coincideEstado = !filtroEstado || reclamo.estado === filtroEstado;

      return coincideEmpresa && coincideEstado;
    });
  }, [reclamos, filtroEmpresa, filtroEstado]);

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    return new Date(fecha).toLocaleDateString();
  };

  return (
    <div className="auditorias-wrapper">
      <h2>Reclamos / informes</h2>

      <p>
        Registre reclamos asociados a servicios y consulte el historial cargado.
      </p>

      <form className="auditoria-form" onSubmit={guardarReclamo}>
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Seleccione empresa *</option>

          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nombre}
            </option>
          ))}
        </select>

        <select
          value={auditoriaId}
          onChange={(e) => setAuditoriaId(e.target.value)}
          disabled={!empresaId}
        >
          <option value="">Auditoría relacionada opcional</option>

          {auditoriasFiltradas.map((auditoria) => (
            <option key={auditoria.id} value={auditoria.id}>
              Auditoría #{auditoria.id} - {auditoria.fecha || "Sin fecha"}
            </option>
          ))}
        </select>

        <select value={servicio} onChange={(e) => setServicio(e.target.value)}>
          <option value="">Seleccione servicio *</option>
          <option value="comedor">Comedor</option>
          <option value="viandas">Viandas</option>
          <option value="capacitaciones">Capacitaciones</option>
          <option value="limpieza">Limpieza</option>
          <option value="otro">Otro</option>
        </select>

        <input
          type="text"
          placeholder="Título del reclamo *"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />

        <textarea
          placeholder="Descripción del reclamo *"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <select value={gravedad} onChange={(e) => setGravedad(e.target.value)}>
          <option value="reclamo">Reclamo (-2 pts)</option>
          <option value="informe_observacion">Informe de observación (-8 pts)</option>
          <option value="informe_no_conformidad">
            Informe de no conformidad (-15 pts)
          </option>
        </select>

        <input
          ref={archivoInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => setArchivo(e.target.files[0] || null)}
        />

        <textarea
          placeholder="Observaciones internas"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        {error && <p className="error-message">{error}</p>}
        {mensaje && <p className="success-message">{mensaje}</p>}

        <button className="new-audit-button" type="submit">
          Guardar reclamo / informe
        </button>
      </form>

      <section className="reclamos-section">
        <div className="reclamos-header">
          <h3>{esAdmin ? "Todos los reclamos" : "Mis reclamos vinculados"}</h3>
          <button type="button" onClick={cargarReclamos}>
            Actualizar
          </button>
        </div>

        <div className="filters-card reclamos-filters">
          {esAdmin && (
            <select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value)}
            >
              <option value="">Todas las empresas</option>

              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_revision">En revisión</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>

        {reclamosFiltrados.length === 0 ? (
          <div className="empty-state">
            <h3>No hay reclamos para mostrar</h3>
            <p>Los reclamos registrados aparecerán en esta sección.</p>
          </div>
        ) : (
          <div className="reclamos-grid">
            {reclamosFiltrados.map((reclamo) => (
              <article className="reclamo-card" key={reclamo.id}>
                <div className="reclamo-card-header">
                  <div>
                    <h4>{reclamo.titulo}</h4>
                    <span>{reclamo.empresa_nombre || "Sin empresa"}</span>
                  </div>

                  <strong className={`reclamo-severity severity-${reclamo.gravedad}`}>
                    {String(reclamo.gravedad || "").replaceAll("_", " ")}
                  </strong>
                </div>

                <p>{reclamo.descripcion}</p>

                <div className="reclamo-meta">
                  <span>Servicio: {reclamo.servicio}</span>
                  <span>Estado: {reclamo.estado || "pendiente"}</span>
                  <span>
                    Ponderación: -{obtenerDescuentoReclamo(reclamo)} pts
                  </span>
                  <span>Fecha: {formatearFecha(reclamo.fecha_creacion)}</span>
                  <span>
                    Auditoría:{" "}
                    {reclamo.auditoria_id
                      ? `#${reclamo.auditoria_id}`
                      : "Sin vincular"}
                  </span>
                  {esAdmin && (
                    <span>Auditor: {reclamo.auditor_nombre || "Sin asignar"}</span>
                  )}
                </div>

                {reclamo.archivo_url && (
                  <button
                    className="reclamo-adjunto-button"
                    type="button"
                    onClick={() => abrirAdjunto(reclamo)}
                  >
                    Ver adjunto
                  </button>
                )}

                {reclamo.observaciones && (
                  <div className="reclamo-observaciones">
                    {reclamo.observaciones}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


