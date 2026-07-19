import { useEffect, useState } from "react";
import CumplimientoMenu from "./cumplimientoMenu";
import AuditoriaArchivo from "./auditoriaArchivo";
import CapacitacionesEvaluacion from "./capacitacionesEvaluacion";

export default function NuevaAuditoria() {
  const [categoria, setCategoria] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [criterios, setCriterios] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [empresaId, setEmpresaId] = useState("");
  const [lugar, setLugar] = useState("");
  const [respuestas, setRespuestas] = useState({});

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [auditoriaEnviada, setAuditoriaEnviada] = useState(false);
  const [resumenAuditoria, setResumenAuditoria] = useState(null);

  const token = localStorage.getItem("token");

  const categorias = [
    {
      id: "inocuidad",
      titulo: "Inocuidad",
      texto: "Controles de seguridad alimentaria, higiene y buenas prácticas.",
      imagen: "/categoria-inocuidad.jpg",
    },
    {
      id: "servicios",
      titulo: "Servicios",
      texto: "Evaluación de comedor, viandas, atención y calidad del servicio.",
      imagen: "/categoria-servicios.jpg",
    },
    {
      id: "SYSO",
      titulo: "SYSO",
      texto: "Revisión de seguridad ocupacional, prevención y condiciones de trabajo.",
      imagen: "/categoria-syso.jpg",
    },
  ];

  useEffect(() => {
    cargarPlantillas();
    cargarEmpresas();
  }, []);

  const normalizarTexto = (texto = "") =>
    String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const quitarCriteriosDuplicados = (lista = []) => {
    const vistos = new Set();
    return lista.filter((criterio) => {
      const clave = String(criterio.numero || criterio.texto || criterio.id)
        .trim()
        .toLowerCase();
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  };

  const esPlantillaArchivo = (plantilla) => {
    return plantilla?.tipo === "archivo";
  };

  const cargarPlantillas = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/plantillas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (res.ok) {
        const listaPlantillas = Array.isArray(data)
          ? data
          : Array.isArray(data?.plantillas)
            ? data.plantillas
            : [];

        setPlantillas(listaPlantillas);
      } else {
        setError(data.message || "Error al cargar plantillas.");
      }
    } catch (error) {
      setError("Error al cargar plantillas.");
    }
  };

  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setEmpresas(Array.isArray(data) ? data : []);
      } else {
        setError(data.message || "Error al cargar empresas.");
      }
    } catch (error) {
      setError("Error al cargar empresas.");
    }
  };

  const seleccionarPlantilla = async (plantilla) => {
    setPlantillaSeleccionada(plantilla);
    setMensaje("");
    setError("");
    setRespuestas({});
    setEmpresaId("");
    setLugar("");
    setCriterios([]);

    const nombre = normalizarTexto(plantilla?.nombre);

    const esCumplimientoMenu = nombre.includes("cumplimiento menu");
    const esAuditoriaArchivo = esPlantillaArchivo(plantilla);
    const esCapacitaciones = nombre.includes("seguimiento de capacitaciones");

    if (esCumplimientoMenu || esAuditoriaArchivo || esCapacitaciones) {
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/plantillas/${plantilla.id}/criterios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (res.ok) {
        setCriterios(quitarCriteriosDuplicados(Array.isArray(data) ? data : []));
      } else {
        setError(data.message || "No se pudieron cargar los criterios.");
      }
    } catch (error) {
      setError("Error al cargar criterios.");
    }
  };

  const actualizarRespuesta = (criterioId, campo, valor) => {
    setRespuestas((prev) => ({
      ...prev,
      [criterioId]: {
        ...prev[criterioId],
        criterio_id: criterioId,
        [campo]: valor,
      },
    }));
  };

  const guardarAuditoria = async () => {
    setMensaje("");
    setError("");

    if (!empresaId || !plantillaSeleccionada) {
      setError("Debe seleccionar empresa y plantilla.");
      return;
    }

    try {
      const auditoriaRes = await fetch(`${process.env.REACT_APP_API_URL}/api/auditorias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plantilla_id: plantillaSeleccionada.id,
          empresa_id: Number(empresaId),
          lugar,
        }),
      });

      const auditoriaData = await auditoriaRes.json();

      if (!auditoriaRes.ok) {
        setError(auditoriaData.message || "No se pudo crear la auditoría.");
        return;
      }

      const auditoriaId = auditoriaData.auditoria.id;

      const respuestasArray = criterios.map((c) => ({
        criterio_id: c.id,
        puntuacion: respuestas[c.id]?.no_verificable
          ? null
          : Number(respuestas[c.id]?.puntuacion || 0),
        observacion: respuestas[c.id]?.observacion || "",
        no_verificable: respuestas[c.id]?.no_verificable || false,
      }));

      const puntajeObtenido = respuestasArray.reduce(
        (acc, r) => acc + (r.puntuacion || 0),
        0,
      );

      const puntajeMaximo = criterios.reduce((acc, c) => {
        if (respuestas[c.id]?.no_verificable) return acc;
        return acc + (c.puntaje_maximo || 2);
      }, 0);

      const porcentaje =
        puntajeMaximo > 0
          ? Math.round((puntajeObtenido / puntajeMaximo) * 100)
          : 0;

      const respuestasRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/${auditoriaId}/respuestas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ respuestas: respuestasArray }),
        },
      );

      const respuestasData = await respuestasRes.json();

      if (respuestasRes.ok) {
        const empresaSeleccionada = empresas.find(
          (e) => e.id === Number(empresaId),
        );

        setResumenAuditoria({
          empresa: empresaSeleccionada?.nombre || "-",
          lugar,
          fecha: new Date().toLocaleDateString("es-UY"),
          puntaje: respuestasData.puntaje?.porcentajeFinal ?? porcentaje,
          plantilla: plantillaSeleccionada.nombre,
        });

        setMensaje("Auditoría guardada correctamente.");
        setAuditoriaEnviada(true);

        setRespuestas({});
        setLugar("");
        setEmpresaId("");
      } else {
        setError(
          respuestasData.message || "No se pudieron guardar respuestas.",
        );
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const volverAPlantillas = () => {
    setCriterios([]);
    setRespuestas({});
    setPlantillaSeleccionada(null);
    setMensaje("");
    setError("");
  };

  const coincideCategoria = (plantilla) => {
    const categoriaPlantilla = normalizarTexto(plantilla?.categoria).trim();
    const categoriaActual = normalizarTexto(categoria).trim();

    if (!categoriaPlantilla || !categoriaActual) {
      return false;
    }

    return (
      categoriaPlantilla === categoriaActual ||
      categoriaPlantilla.includes(categoriaActual) ||
      categoriaActual.includes(categoriaPlantilla)
    );
  };

  const obtenerImagenCategoria = (categoriaPlantilla) => {
    const categoriaNormalizada = normalizarTexto(categoriaPlantilla).trim();

    const opcion = categorias.find((item) => {
      const idNormalizado = normalizarTexto(item.id).trim();
      const tituloNormalizado = normalizarTexto(item.titulo).trim();

      return (
        categoriaNormalizada === idNormalizado ||
        categoriaNormalizada === tituloNormalizado ||
        categoriaNormalizada.includes(idNormalizado) ||
        idNormalizado.includes(categoriaNormalizada)
      );
    });

    return opcion?.imagen || "/categoria-inocuidad.jpg";
  };

  const plantillasFiltradas = Array.isArray(plantillas)
    ? plantillas.filter(coincideCategoria)
    : [];

  const nombrePlantilla = normalizarTexto(plantillaSeleccionada?.nombre);

  const esCumplimientoMenu = nombrePlantilla.includes("cumplimiento menu");

  const esAuditoriaArchivo = esPlantillaArchivo(plantillaSeleccionada);
  const esCapacitaciones = nombrePlantilla.includes(
    "seguimiento de capacitaciones",
  );

  const tipoServicioMenu = nombrePlantilla.includes("vianda")
    ? "viandas"
    : "comedor";

  if (auditoriaEnviada) {
    return (
      <div className="success-screen">
        <img src="/success-audit.gif" alt="Auditoría registrada" />

        <h2>Auditoría registrada</h2>
        <p>La información quedó almacenada correctamente.</p>

        <div className="audit-summary">
          <div className="summary-item">
            <span>Empresa</span>
            <strong>{resumenAuditoria?.empresa}</strong>
          </div>

          <div className="summary-item">
            <span>Auditoría</span>
            <strong>{resumenAuditoria?.plantilla}</strong>
          </div>

          <div className="summary-item">
            <span>Lugar</span>
            <strong>{resumenAuditoria?.lugar || "-"}</strong>
          </div>

          <div className="summary-item">
            <span>Fecha</span>
            <strong>{resumenAuditoria?.fecha}</strong>
          </div>

          <div className="summary-item score">
            <span>Resultado</span>
            <strong>{resumenAuditoria?.puntaje}%</strong>
          </div>
        </div>

        <button
          className="new-audit-button"
          onClick={() => {
            setAuditoriaEnviada(false);
            setPlantillaSeleccionada(null);
            setCategoria(null);
            setCriterios([]);
            setMensaje("");
            setResumenAuditoria(null);
          }}
        >
          + Crear nueva auditoría
        </button>
      </div>
    );
  }

  if (!categoria) {
    return (
      <div className="auditorias-wrapper">
        <h2>Nueva auditoría/evaluación</h2>
        <p>Seleccione el tipo de auditoría o evaluación que desea realizar.</p>

        <div className="audit-type-grid">
          {categorias.map((opcion) => (
            <button
              className="audit-type-card"
              key={opcion.id}
              onClick={() => setCategoria(opcion.id)}
            >
              <img src={opcion.imagen} alt="" />
              <span>{opcion.titulo}</span>
              <small>{opcion.texto}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (categoria && !plantillaSeleccionada) {
    return (
      <div className="auditorias-wrapper">
        <button className="back-button" onClick={() => setCategoria(null)}>
          ←
        </button>

        <h2>{categoria === "inocuidad" ? "Inocuidad" : categoria === "servicios"? "Servicios":"SYSO"}</h2>
        <p>Seleccione una plantilla de auditoría/evaluación.</p>

        <div className="plantillas-grid">
          {plantillasFiltradas.length === 0 ? (
            <div className="empty-state">
              <h3>No hay plantillas disponibles</h3>
              <p>No se encontraron plantillas activas para esta categoria.</p>
            </div>
          ) : (
            plantillasFiltradas.map((p) => (
              <div className="plantilla-card" key={p.id}>
                <img
                  className="plantilla-image"
                  src={obtenerImagenCategoria(p?.categoria)}
                  alt=""
                />
                <h3>{p.nombre}</h3>
                <p>{p.descripcion}</p>

                <button onClick={() => seleccionarPlantilla(p)}>
                  Usar plantilla
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (esAuditoriaArchivo) {
    return (
      <div className="auditorias-wrapper">
        <button className="back-button" onClick={volverAPlantillas}>
          ←
        </button>

        <AuditoriaArchivo
          plantillaSeleccionada={plantillaSeleccionada}
          empresas={empresas}
          volver={volverAPlantillas}
        />
      </div>
    );
  }

  if (esCapacitaciones) {
    return (
      <div className="auditorias-wrapper">
        <button className="back-button" onClick={volverAPlantillas}>
          ←
        </button>

        <CapacitacionesEvaluacion
          plantillaSeleccionada={plantillaSeleccionada}
          empresas={empresas}
        />
      </div>
    );
  }

  if (esCumplimientoMenu) {
    return (
      <div className="auditorias-wrapper">
        <button className="back-button" onClick={volverAPlantillas}>
          ←
        </button>

        <CumplimientoMenu
          tipoServicio={tipoServicioMenu}
          plantillaSeleccionada={plantillaSeleccionada}
          empresas={empresas}
          volver={volverAPlantillas}
        />
      </div>
    );
  }

  return (
    <div className="auditorias-wrapper">
      <button className="back-button" onClick={volverAPlantillas}>
        ←
      </button>

      <h2>{plantillaSeleccionada.nombre}</h2>

      <div className="auditoria-form-header">
        <select
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
        >
          <option value="">Seleccione empresa</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>

        <input
          placeholder="Lugar / sector auditado"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
        />
      </div>

      <div className="criterios-list">
        {criterios.map((c) => (
          <div className="criterio-card" key={c.id}>
            <h4>
              {c.numero}. {c.texto}
            </h4>

            <p>{c.seccion}</p>

            <div className="puntaje-options">
              {Array.from(
                { length: (c.puntaje_maximo || 2) + 1 },
                (_, i) => i,
              ).map((valor) => (
                <label key={valor}>
                  <input
                    type="radio"
                    name={`criterio-${c.id}`}
                    value={valor}
                    disabled={respuestas[c.id]?.no_verificable}
                    checked={Number(respuestas[c.id]?.puntuacion) === valor}
                    onChange={() =>
                      actualizarRespuesta(c.id, "puntuacion", valor)
                    }
                  />
                  {valor}
                </label>
              ))}

              <label>
                <input
                  type="checkbox"
                  checked={respuestas[c.id]?.no_verificable || false}
                  onChange={(e) =>
                    actualizarRespuesta(
                      c.id,
                      "no_verificable",
                      e.target.checked,
                    )
                  }
                />
                No verificable
              </label>
            </div>

            <textarea
              placeholder="Observaciones"
              value={respuestas[c.id]?.observacion || ""}
              onChange={(e) =>
                actualizarRespuesta(c.id, "observacion", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      {error && <p className="error-message">{error}</p>}
      {mensaje && <p className="success-message">{mensaje}</p>}

      <button className="new-audit-button" onClick={guardarAuditoria}>
        Guardar auditoría
      </button>
    </div>
  );
}
