import { useEffect, useState } from "react";
import CumplimientoMenu from "./cumplimientoMenu";
import AuditoriaArchivo from "./auditoriaArchivo";

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
      imagen: "/nutricion.jpg",
    },
    {
      id: "servicios",
      titulo: "Servicios",
      texto: "Evaluación de comedor, viandas, atención y calidad del servicio.",
      imagen: "/nutricion.png",
    },
    {
      id: "SYSO",
      titulo: "SYSO",
      texto: "Revisión de seguridad ocupacional, prevención y condiciones de trabajo.",
      imagen: "/logo.png",
    },
  ];

  useEffect(() => {
    cargarPlantillas();
    cargarEmpresas();
  }, []);

  const normalizarTexto = (texto = "") =>
    texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const esPlantillaArchivo = (plantilla) => {
    const nombre = normalizarTexto(plantilla?.nombre);

    return (
      plantilla?.tipo === "archivo" ||
      nombre.includes("seguimiento de capacitaciones")
    );
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
        setPlantillas(data);
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
        setEmpresas(data);
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

    const nombre = normalizarTexto(plantilla.nombre);

    const esCumplimientoMenu = nombre.includes("cumplimiento menu");
    const esAuditoriaArchivo = esPlantillaArchivo(plantilla);

    if (esCumplimientoMenu || esAuditoriaArchivo) {
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
        setCriterios(data);
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

      const puntajeMaximo = criterios.reduce(
        (acc, c) => acc + (c.puntaje_maximo || 2),
        0,
      );

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
          fecha: new Date().toLocaleDateString(),
          puntaje: porcentaje,
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
    setPlantillaSeleccionada(null);
    setCriterios([]);
    setMensaje("");
    setError("");
  };

  const plantillasFiltradas = plantillas.filter(
    (p) => p.categoria === categoria,
  );

  const nombrePlantilla = normalizarTexto(plantillaSeleccionada?.nombre);

  const esCumplimientoMenu = nombrePlantilla.includes("cumplimiento menu");

  const esAuditoriaArchivo = esPlantillaArchivo(plantillaSeleccionada);

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
        <h2>Nueva auditoría</h2>
        <p>Seleccione el tipo de auditoría que desea realizar.</p>

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
        <p>Seleccione una plantilla de auditoría.</p>

        <div className="plantillas-grid">
          {plantillasFiltradas.map((p) => (
            <div className="plantilla-card" key={p.id}>
              <div className="plantilla-image"></div>
              <h3>{p.nombre}</h3>
              <p>{p.descripcion}</p>

              <button onClick={() => seleccionarPlantilla(p)}>
                Usar plantilla
              </button>
            </div>
          ))}
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
