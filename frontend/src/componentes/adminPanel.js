import { useState } from "react";
import PendingUsers from "./usuariosPendientes";

export default function AdminPanel({ logout }) {
  const [seccion, setSeccion] = useState("solicitudes");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-layout">

      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <h2>Menu</h2>

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

        <button onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="admin-content">
        

        {seccion === "solicitudes" && (
          <>
        
            <PendingUsers />
          </>
        )}

        {seccion === "empresas" && (
          <>
            <h3>Gestión de empresas</h3>
            <p>Próximamente...</p>
          </>
        )}
      </main>
    </div>
  );
}