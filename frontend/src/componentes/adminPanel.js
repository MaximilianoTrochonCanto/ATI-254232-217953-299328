import { useState } from "react";
import PendingUsers from "./usuariosPendientes";
import GestionEmpresas from "./gestionEmpresas";
import ListaAuditorias from "./listaAuditorias";
import NuevaAuditoria from "./nuevaAuditoria";
import ReclamoInforme from "./reclamoInforme";

export default function AdminPanel({ logout }) {
  const [seccion, setSeccion] = useState("solicitudes");
  const [menuOpen, setMenuOpen] = useState(false);

  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);
    setMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <div
        className="notification-bell"
        onClick={() => {
          setMostrarNotificaciones(!mostrarNotificaciones);

          setNotificaciones((prev) =>
            prev.map((n) => ({
              ...n,
              leida: true,
            }))
          );
        }}
      >
        🔔

        {noLeidas > 0 && (
          <span className="notification-badge">
            {noLeidas}
          </span>
        )}
      </div>

      {mostrarNotificaciones && (
        <div className="notifications-panel">
          {notificaciones.length === 0 ? (
            <p>No hay notificaciones</p>
          ) : (
            notificaciones.map((n) => (
              <div
                key={n.id}
                className="notification-item"
              >
                <strong>{n.titulo}</strong>
                <p>{n.mensaje}</p>
              </div>
            ))
          )}
        </div>
      )}

      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <h2>Panel Admin</h2>

        <button
          onClick={() => cambiarSeccion("solicitudes")}
        >
          Solicitudes de acceso
        </button>

        <button
          onClick={() => cambiarSeccion("empresas")}
        >
          Gestión de empresas
        </button>

        <button
          onClick={() => cambiarSeccion("auditorias")}
        >
          Todas las auditorías
        </button>

        <button
          onClick={() => cambiarSeccion("nueva")}
        >
          Nueva auditoría
        </button>

        <button
          onClick={() => cambiarSeccion("reclamos")}
        >
          Reclamos / Informes
        </button>

        <button
          onClick={() => cambiarSeccion("reportes")}
        >
          Reportes
        </button>

        <button onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="admin-content">
        {seccion === "solicitudes" && (
          <PendingUsers
            logout={logout}
            setNotificaciones={setNotificaciones}
          />
        )}

        {seccion === "empresas" && (
          <GestionEmpresas logout={logout} />
        )}

        {seccion === "auditorias" && (
          <ListaAuditorias
            modo="admin"
            logout={logout}
          />
        )}

        {seccion === "nueva" && (
          <NuevaAuditoria />
        )}

        {seccion === "reclamos" && (
          <ReclamoInforme />
        )}

        {seccion === "reportes" && (
          <div className="empty-state">
            <h3>Reportes</h3>
            <p>
              Esta sección se desarrollará en próximos
              sprints.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}