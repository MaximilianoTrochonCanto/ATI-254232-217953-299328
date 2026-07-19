import { useState } from "react";

export default function CapacitacionesEvaluacion({
  plantillaSeleccionada,
  empresas,
}) {
  const [empresaId, setEmpresaId] = useState("");
  const [lugar, setLugar] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [fechas, setFechas] = useState([""]);
  const [archivo, setArchivo] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [successScreen, setSuccessScreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const cambiarCantidad = (valor) => {
    const nuevaCantidad = Math.max(1, Number(valor) || 1);
    setCantidad(nuevaCantidad);
    setFechas((prev) => {
      const copia = [...prev];
      while (copia.length < nuevaCantidad) copia.push("");
      return copia.slice(0, nuevaCantidad);
    });
  };

  const actualizarFecha = (index, valor) => {
    setFechas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  const guardarEvaluacion = async () => {
    setError("");

    if (!empresaId) {
      setError("Debe seleccionar una empresa.");
      return;
    }

    if (!archivo) {
      setError("Debe adjuntar la documentación de respaldo.");
      return;
    }

    const detalleFechas = fechas
      .map((fecha, index) => `Capacitación ${index + 1}: ${fecha || "sin fecha"}`)
      .join(" | ");

    const formData = new FormData();
    formData.append("plantilla_id", plantillaSeleccionada.id);
    formData.append("empresa_id", empresaId);
    formData.append("lugar", lugar);
    formData.append(
      "observaciones",
      `Cantidad de capacitaciones: ${cantidad}. ${detalleFechas}. ${observaciones}`,
    );
    formData.append("archivo", archivo);

    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auditorias/archivo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccessScreen(true);
      } else {
        setError(data.message || "No se pudo guardar la evaluación.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (successScreen) {
    return (
      <div className="success-screen">
        <img src="/success-audit.gif" alt="Evaluación registrada" />
        <h2>Evaluación registrada</h2>
        <p>La cantidad, las fechas y la documentación quedaron guardadas.</p>
      </div>
    );
  }

  return (
    <div className="auditorias-wrapper">
      <h2>{plantillaSeleccionada.nombre}</h2>
      <p>Registre cantidad, fecha de cada capacitación y adjunte evidencia.</p>

      <div className="auditoria-form-header">
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Seleccione empresa</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nombre}
            </option>
          ))}
        </select>

        <input
          placeholder="Lugar / sector"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
        />
      </div>

      <div className="file-upload-card">
        <label>Cantidad de capacitaciones</label>
        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => cambiarCantidad(e.target.value)}
        />

        {fechas.map((fecha, index) => (
          <input
            key={index}
            type="date"
            value={fecha}
            onChange={(e) => actualizarFecha(index, e.target.value)}
          />
        ))}

        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={(e) => setArchivo(e.target.files[0] || null)}
        />

        <textarea
          placeholder="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      <button
        className="new-audit-button"
        onClick={guardarEvaluacion}
        disabled={loading}
      >
        {loading ? "Guardando..." : "Guardar evaluación"}
      </button>
    </div>
  );
}
