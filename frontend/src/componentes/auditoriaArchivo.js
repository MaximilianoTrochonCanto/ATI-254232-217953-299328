import { useState } from "react";

export default function AuditoriaArchivo({ plantillaSeleccionada, empresas }) {
  const [empresaId, setEmpresaId] = useState("");
  const [lugar, setLugar] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState("");
  const [successScreen, setSuccessScreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const guardarArchivo = async () => {
    setError("");

    if (!empresaId) {
      setError("Debe seleccionar una empresa.");
      return;
    }

    if (!archivo) {
      setError("Debe adjuntar un archivo.");
      return;
    }

    const formData = new FormData();

    formData.append("plantilla_id", plantillaSeleccionada.id);
    formData.append("empresa_id", empresaId);
    formData.append("lugar", lugar);
    formData.append("observaciones", observaciones);
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

      const text = await res.text();

let data = {};

try {
  data = text ? JSON.parse(text) : {};
} catch (error) {
  data = {};
}

if (res.ok) {
  setSuccessScreen(true);
} else {
  setError(data.message || "No se pudo cargar el documento.");
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
        <img src="/success-audit.gif" alt="Documento cargado" />

        <h2>Documento cargado correctamente</h2>

        <p>
          El archivo y las observaciones quedaron registrados en el sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="auditorias-wrapper">
      <h2>{plantillaSeleccionada.nombre}</h2>

      <p>
        Adjunte el documento recibido y agregue las observaciones necesarias.
      </p>

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
          placeholder="Lugar / sector"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
        />
      </div>

      <div className="file-upload-card">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setArchivo(e.target.files[0])}
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
        onClick={guardarArchivo}
        disabled={loading}
      >
        {loading ? "Cargando..." : "Guardar documento"}
      </button>
    </div>
  );
}
