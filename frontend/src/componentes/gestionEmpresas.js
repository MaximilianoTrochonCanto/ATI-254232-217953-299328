import { useEffect, useState } from "react";

export default function GestionEmpresas({ logout }) {
  const [empresas, setEmpresas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const limpiarMensajes = () => {
    setError("");
    setSuccess("");
  };

  const limpiarFormulario = () => {
    setNombre("");
    setDireccion("");
    setEditandoId(null);
  };

  const cargarEmpresas = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/empresas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        setEmpresas(data);
      } else {
        setError(data.message || "No se pudieron cargar las empresas.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const guardarEmpresa = async () => {
    limpiarMensajes();

    if (!nombre.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }

    try {
      setLoading(true);

      const url = editandoId
        ? `http://localhost:3001/api/empresas/${editandoId}`
        : "http://localhost:3001/api/empresas";

      const method = editandoId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          direccion,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        limpiarFormulario();
        cargarEmpresas();
      } else {
        setError(data.message || "No se pudo guardar la empresa.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const editarEmpresa = (empresa) => {
    limpiarMensajes();
    setEditandoId(empresa.id);
    setNombre(empresa.nombre);
    setDireccion(empresa.direccion || "");
  };

  const eliminarEmpresa = async (id) => {
    limpiarMensajes();

    const confirmar = window.confirm(
      "¿Seguro que desea eliminar esta empresa?",
    );

    if (!confirmar) return;

    try {
      const res = await fetch(`http://localhost:3001/api/empresas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        cargarEmpresas();
      } else {
        setError(data.message || "No se pudo eliminar la empresa.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  return (
    <div className="empresas-wrapper">
      <h2>Gestión de empresas</h2>

      <div className="empresa-form">
        <h3>{editandoId ? "Editar empresa" : "Agregar empresa"}</h3>

        <input
          placeholder="Nombre de la empresa"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            limpiarMensajes();
          }}
        />

        <input
          placeholder="Dirección / ubicación"
          value={direccion}
          onChange={(e) => {
            setDireccion(e.target.value);
            limpiarMensajes();
          }}
        />

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        <div className="empresa-actions">
          <button onClick={guardarEmpresa} disabled={loading}>
            {loading
              ? "Guardando..."
              : editandoId
                ? "Guardar cambios"
                : "Nueva"}
          </button>

          {editandoId && (
            <button className="btn-secundario" onClick={limpiarFormulario}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="empresas-list">
        {empresas.length === 0 ? (
          <div className="empty-state">
            <h3>No hay empresas registradas</h3>
            <p>Agregue una empresa para comenzar.</p>
          </div>
        ) : (
          empresas.map((empresa) => (
            <div className="empresa-card" key={empresa.id}>
              <div>
                <h4>{empresa.nombre}</h4>
                <p>{empresa.direccion || "Sin dirección registrada"}</p>
              </div>

              <div className="empresa-card-actions">
                <button onClick={() => editarEmpresa(empresa)}>Editar</button>
                <button
                  className="btn-rechazar"
                  onClick={() => eliminarEmpresa(empresa.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
