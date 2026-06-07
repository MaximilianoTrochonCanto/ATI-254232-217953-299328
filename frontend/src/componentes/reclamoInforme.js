import { useEffect, useState } from "react";

export default function ReclamoInforme() {
  const [empresas, setEmpresas] = useState([]);
  const [auditorias, setAuditorias] = useState([]);

  const [empresaId, setEmpresaId] = useState("");
  const [auditoriaId, setAuditoriaId] = useState("");
  const [servicio, setServicio] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [gravedad, setGravedad] = useState("media");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

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

  const cargarAuditorias = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/auditorias", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setAuditorias(data);
      }
    } catch (error) {
      console.log("Error al cargar auditorías.");
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
      const res = await fetch("http://localhost:3001/api/reclamos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje("Reclamo / informe registrado correctamente.");

        setEmpresaId("");
        setAuditoriaId("");
        setServicio("");
        setTitulo("");
        setDescripcion("");
        setGravedad("media");
        setObservaciones("");
        setArchivo(null);
      } else {
        setError(data.message || "No se pudo registrar el reclamo.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const auditoriasFiltradas = auditorias.filter(
    (a) => Number(a.empresa_id) === Number(empresaId)
  );

  return (
    <div className="auditorias-wrapper">
      <h2>Agregar reclamo / informe</h2>

      <p>
        Registre un reclamo específico asociado a un servicio. Puede vincularse
        a una auditoría existente o quedar pendiente para futuras evaluaciones.
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
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => setArchivo(e.target.files[0])}
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
    </div>
  );
}