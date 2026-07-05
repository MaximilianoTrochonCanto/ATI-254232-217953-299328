import { useEffect, useState } from "react";

export default function CumplimientoMenu({
  tipoServicio = "comedor",
  plantillaSeleccionada,
  empresas,
}) {
  const [cantidadMenus, setCantidadMenus] = useState(1);
  const [menus, setMenus] = useState([crearMenuInicial(1)]);
  const [empresaId, setEmpresaId] = useState("");
  const [lugar, setLugar] = useState("");

  const [criterios, setCriterios] = useState([]);
  const [error, setError] = useState("");
  const [successScreen, setSuccessScreen] = useState(false);
  const [resumenAuditoria, setResumenAuditoria] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  function crearMenuInicial(numero) {
    return {
      numero,
      platoPrincipal: "",
      platoPrincipalPuntaje: "",
      guarnicion: "",
      guarnicionPuntaje: "",
      postre: "",
      postrePuntaje: "",
      bebida: "",
      bebidaPuntaje: "",
      libreGluten: false,
      libreGlutenPuntaje: "",
      observaciones: "",
    };
  }

  useEffect(() => {
    cargarCriterios();
  }, []);

  const cargarCriterios = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/plantillas/${plantillaSeleccionada.id}/criterios`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setCriterios(data);
      } else {
        setError(data.message || "No se pudieron cargar criterios.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    }
  };

  const cambiarCantidadMenus = (cantidad) => {
    const nuevaCantidad = Number(cantidad);

    if (nuevaCantidad < 1) return;

    setCantidadMenus(nuevaCantidad);

    setMenus((prev) => {
      const nuevosMenus = [...prev];

      while (nuevosMenus.length < nuevaCantidad) {
        nuevosMenus.push(crearMenuInicial(nuevosMenus.length + 1));
      }

      return nuevosMenus.slice(0, nuevaCantidad);
    });
  };

  const actualizarMenu = (index, campo, valor) => {
    const copia = [...menus];

    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };

    setMenus(copia);
  };

  const obtenerCriterio = (texto) => {
    return criterios.find((c) =>
      c.texto.toLowerCase().includes(texto.toLowerCase())
    );
  };

  const guardarCumplimientoMenu = async () => {
    setError("");

    if (!empresaId) {
      setError("Debe seleccionar una empresa.");
      return;
    }

    if (!plantillaSeleccionada) {
      setError("Debe seleccionar una plantilla.");
      return;
    }

    try {
      setLoading(true);

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
          observacion_general: `Cantidad de menús evaluados: ${cantidadMenus}`,
        }),
      });

      const auditoriaData = await auditoriaRes.json();

      if (!auditoriaRes.ok) {
        setError(auditoriaData.message || "No se pudo crear la auditoría.");
        return;
      }

      const auditoriaId = auditoriaData.auditoria.id;

      const criterioPlato = obtenerCriterio("Plato principal");
      const criterioGuarnicion = obtenerCriterio("Guarnición");
      const criterioPostre = obtenerCriterio("Postre");
      const criterioBebida = obtenerCriterio("Bebida");
      const criterioLibreGluten = obtenerCriterio("Libre de gluten");

      const respuestasArray = [];

      menus.forEach((menu) => {
        if (criterioPlato) {
          respuestasArray.push({
            criterio_id: criterioPlato.id,
            puntuacion: Number(menu.platoPrincipalPuntaje || 0),
            observacion: `Menú ${menu.numero} - Plato principal: ${menu.platoPrincipal || "Sin detalle"}`,
            no_verificable: false,
          });
        }

        if (criterioGuarnicion) {
          respuestasArray.push({
            criterio_id: criterioGuarnicion.id,
            puntuacion: Number(menu.guarnicionPuntaje || 0),
            observacion: `Menú ${menu.numero} - Guarnición: ${menu.guarnicion || "Sin detalle"}`,
            no_verificable: false,
          });
        }

        if (criterioPostre) {
          respuestasArray.push({
            criterio_id: criterioPostre.id,
            puntuacion: Number(menu.postrePuntaje || 0),
            observacion: `Menú ${menu.numero} - Postre: ${menu.postre || "Sin detalle"}`,
            no_verificable: false,
          });
        }

        if (criterioBebida) {
          respuestasArray.push({
            criterio_id: criterioBebida.id,
            puntuacion: Number(menu.bebidaPuntaje || 0),
            observacion: `Menú ${menu.numero} - Bebida: ${menu.bebida || "Sin detalle"}`,
            no_verificable: false,
          });
        }

        if (criterioLibreGluten) {
          respuestasArray.push({
            criterio_id: criterioLibreGluten.id,
            puntuacion: Number(menu.libreGlutenPuntaje || 0),
            observacion: `Menú ${menu.numero} - Libre de gluten: ${
              menu.libreGluten ? "Sí" : "No"
            }. ${menu.observaciones || ""}`,
            no_verificable: false,
          });
        }
      });

      const respuestasRes = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auditorias/${auditoriaId}/respuestas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ respuestas: respuestasArray }),
        }
      );

      const respuestasData = await respuestasRes.json();

      if (!respuestasRes.ok) {
        setError(respuestasData.message || "No se pudieron guardar respuestas.");
        return;
      }

      const puntajeObtenido = respuestasArray.reduce(
        (acc, r) => acc + (r.puntuacion || 0),
        0
      );

      const puntajeMaximo = respuestasArray.length * 2;

      const porcentaje =
        puntajeMaximo > 0
          ? Math.round((puntajeObtenido / puntajeMaximo) * 100)
          : 0;

      const empresaSeleccionada = empresas.find(
        (e) => e.id === Number(empresaId)
      );

      setResumenAuditoria({
        empresa: empresaSeleccionada?.nombre || "-",
        lugar,
        fecha: new Date().toLocaleDateString(),
        puntaje: porcentaje,
        plantilla: plantillaSeleccionada.nombre,
        cantidadMenus,
      });

      setSuccessScreen(true);
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (successScreen) {
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
            <span>Cantidad de menús</span>
            <strong>{resumenAuditoria?.cantidadMenus}</strong>
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
            setSuccessScreen(false);
            setMenus([crearMenuInicial(1)]);
            setCantidadMenus(1);
            setEmpresaId("");
            setLugar("");
            setResumenAuditoria(null);
          }}
        >
          + Crear nueva auditoría
        </button>
      </div>
    );
  }

  return (
    <div className="cumplimiento-wrapper">
      <h2>
        Cumplimiento de menú -{" "}
        {tipoServicio === "comedor" ? "Comedor" : "Viandas"}
      </h2>

      <p>
        Indique la cantidad de menús a evaluar y complete los datos
        correspondientes.
      </p>

      <div className="auditoria-form-header">
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
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

      <div className="menu-count-card">
        <label>Cantidad de menús</label>

        <input
          type="number"
          min="1"
          value={cantidadMenus}
          onChange={(e) => cambiarCantidadMenus(e.target.value)}
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="menus-list">
        {menus.map((menu, index) => (
          <div className="menu-card" key={index}>
            <h3>Menú {menu.numero}</h3>

            <input
              placeholder="Plato principal"
              value={menu.platoPrincipal}
              onChange={(e) =>
                actualizarMenu(index, "platoPrincipal", e.target.value)
              }
            />

            <select
              value={menu.platoPrincipalPuntaje}
              onChange={(e) =>
                actualizarMenu(index, "platoPrincipalPuntaje", e.target.value)
              }
            >
              <option value="">Puntaje plato principal</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>

            <input
              placeholder="Guarnición"
              value={menu.guarnicion}
              onChange={(e) =>
                actualizarMenu(index, "guarnicion", e.target.value)
              }
            />

            <select
              value={menu.guarnicionPuntaje}
              onChange={(e) =>
                actualizarMenu(index, "guarnicionPuntaje", e.target.value)
              }
            >
              <option value="">Puntaje guarnición</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>

            <input
              placeholder="Postre"
              value={menu.postre}
              onChange={(e) =>
                actualizarMenu(index, "postre", e.target.value)
              }
            />

            <select
              value={menu.postrePuntaje}
              onChange={(e) =>
                actualizarMenu(index, "postrePuntaje", e.target.value)
              }
            >
              <option value="">Puntaje postre</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>

            <input
              placeholder="Bebida"
              value={menu.bebida}
              onChange={(e) =>
                actualizarMenu(index, "bebida", e.target.value)
              }
            />

            <select
              value={menu.bebidaPuntaje}
              onChange={(e) =>
                actualizarMenu(index, "bebidaPuntaje", e.target.value)
              }
            >
              <option value="">Puntaje bebida</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={menu.libreGluten}
                onChange={(e) =>
                  actualizarMenu(index, "libreGluten", e.target.checked)
                }
              />
              Libre de gluten
            </label>

            <select
              value={menu.libreGlutenPuntaje}
              onChange={(e) =>
                actualizarMenu(index, "libreGlutenPuntaje", e.target.value)
              }
            >
              <option value="">Puntaje libre de gluten</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>

            <textarea
              placeholder="Observaciones"
              value={menu.observaciones}
              onChange={(e) =>
                actualizarMenu(index, "observaciones", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      <button
        className="new-audit-button"
        onClick={guardarCumplimientoMenu}
        disabled={loading}
      >
        {loading ? "Guardando..." : "Guardar cumplimiento de menú"}
      </button>
    </div>
  );
}
