import { useEffect, useState } from "react";

export default function AuditoriasPanel() {
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
  const token = localStorage.getItem("token");
  const [resumenAuditoria, setResumenAuditoria] =
  useState(null);

  useEffect(() => {
    cargarPlantillas();
    cargarEmpresas();
  }, []);

  const cargarPlantillas = async () => {
    const res = await fetch("http://localhost:3001/api/auditorias/plantillas", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (res.ok) setPlantillas(data);
  };

  const cargarEmpresas = async () => {
    const res = await fetch("http://localhost:3001/api/empresas", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (res.ok) setEmpresas(data);
  };

  const seleccionarPlantilla = async (plantilla) => {
    setPlantillaSeleccionada(plantilla);
    setMensaje("");
    setError("");

    const res = await fetch(
      `http://localhost:3001/api/auditorias/plantillas/${plantilla.id}/criterios`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const data = await res.json();
    if (res.ok) setCriterios(data);
  };

  const actualizarRespuesta = (criterioId, campo, valor) => {
    setRespuestas({
      ...respuestas,
      [criterioId]: {
        ...respuestas[criterioId],
        criterio_id: criterioId,
        [campo]: valor,
      },
    });
  };

  const guardarAuditoria = async () => {
    setMensaje("");
    setError("");

    if (!empresaId || !plantillaSeleccionada) {
      setError("Debe seleccionar empresa y plantilla.");
      return;
    }

    try {
      const auditoriaRes = await fetch("http://localhost:3001/api/auditorias", {
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
        setError(auditoriaData.message);
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
  0
);

const puntajeMaximo = criterios.reduce(
  (acc, c) => acc + c.puntaje_maximo,
  0
);

const porcentaje = Math.round(
  (puntajeObtenido / puntajeMaximo) * 100
);
      const respuestasRes = await fetch(
        `http://localhost:3001/api/auditorias/${auditoriaId}/respuestas`,
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
  (e) => e.id === Number(empresaId)
);

setResumenAuditoria({
  empresa: empresaSeleccionada?.nombre || "-",
  lugar,
  fecha: new Date().toLocaleDateString(),
  puntaje: porcentaje,
  plantilla: plantillaSeleccionada.nombre,
});
        setAuditoriaEnviada(true);
        setMensaje("Auditoría guardada correctamente.");
        setRespuestas({});
        setLugar("");
        setEmpresaId("");
        setPlantillaSeleccionada(null);
        setCriterios([]);
        setCategoria(null);
      } else {
        setError(respuestasData.message);
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const plantillasFiltradas = plantillas.filter(
    (p) => p.categoria === categoria,
  );
  if (auditoriaEnviada) {
    return (
      <div className="success-screen">
        <img src="/success-audit.gif" alt="Auditoría enviada" />

        <h2>Auditoría enviada correctamente</h2>

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
    <strong>
      {resumenAuditoria?.puntaje}%
    </strong>
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
          <button onClick={() => setCategoria("inocuidad")}>Inocuidad</button>

          <button onClick={() => setCategoria("servicios")}>Servicios</button>
        </div>
      </div>
    );
  }

  if (categoria && !plantillaSeleccionada) {
    return (
      <div className="auditorias-wrapper">
        
          <button
  className="back-button"
 onClick={() => setCategoria(null)}
>
    <img src="/back-button.png" />
</button>

        <h2>{categoria === "inocuidad" ? "Inocuidad" : "Servicios"}</h2>
        <p>Seleccione una plantilla de auditoría.</p>

        <div className="plantillas-grid">
          {plantillasFiltradas.map((p) => (
            <div className="plantilla-card" key={p.id}>
              <h3>{p.nombre}</h3>              
              <button onClick={() => seleccionarPlantilla(p)}>
                Usar plantilla
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="auditorias-wrapper">
      <button
  className="back-button"
  onClick={() => {
    setPlantillaSeleccionada(null);
    setCriterios([]);
  }}
>
  <img src="/back-button.png" />
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

      <button onClick={guardarAuditoria}>Guardar auditoría</button>
    </div>
  );
}
