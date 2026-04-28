import { useState } from "react";
import PendingUsers from "./usuariosPendientes";
import GestionEmpresas from "./gestionEmpresas";

export default function AdminPanel({ logout }) {
  const [seccion, setSeccion] = useState("solicitudes");
  const [menuOpen, setMenuOpen] = useState(false);
  
const [notificaciones, setNotificaciones] = useState([]);
const [mostrarNotificaciones, setMostrarNotificaciones] =
  useState(false);
  const noLeidas = notificaciones.filter(
  (n) => !n.leida
).length;
  return (

    
    <div className="admin-layout">
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>
      
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <h2>Menu</h2>
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
        <button
          onClick={() => {
            setSeccion("solicitudes");
            setMenuOpen(false);
          }}
        >
          Solicitudes de acceso
        </button>

        <button
          onClick={() => {
            setSeccion("empresas");
            setMenuOpen(false);
          }}
        >
          Gestión de empresas
        </button>

        <button onClick={logout}>Logout</button>
      </aside>

      <main className="admin-content">
        {seccion === "solicitudes" && (
          <>
            <PendingUsers
              logout={logout}
               setNotificaciones={setNotificaciones}
            />
          </>
        )}

        {seccion === "empresas" && <GestionEmpresas logout={logout} />}
      </main>
    </div>
  );
}
