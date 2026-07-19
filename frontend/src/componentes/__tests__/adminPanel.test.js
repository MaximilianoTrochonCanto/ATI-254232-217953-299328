import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminPanel from "../adminPanel";

jest.mock("../usuariosPendientes", () => () => <div>Vista Usuarios</div>);
jest.mock("../gestionEmpresas", () => () => <div>Vista Empresas</div>);
jest.mock("../listaAuditorias", () => () => <div>Vista Auditorías</div>);
jest.mock("../nuevaAuditoria", () => () => <div>Vista Nueva</div>);
jest.mock("../reclamoInforme", () => () => <div>Vista Reclamos</div>);
jest.mock("../reportesAuditorias", () => () => <div>Vista Reportes</div>);

test("admin navega por todas las secciones principales", () => {
  render(<AdminPanel logout={jest.fn()} />);
  expect(screen.getByText("Vista Usuarios")).toBeInTheDocument();

  const casos = [
    [/Gestión de empresas/i, "Vista Empresas"],
    [/Todas las auditorías/i, "Vista Auditorías"],
    [/Nueva auditoria\/evaluacion/i, "Vista Nueva"],
    [/Reclamos \/ Informes/i, "Vista Reclamos"],
    [/Reportes/i, "Vista Reportes"],
  ];
  casos.forEach(([nombre, vista]) => {
    fireEvent.click(screen.getByRole("button", { name: nombre }));
    expect(screen.getByText(vista)).toBeInTheDocument();
  });
});

test("admin abre notificaciones y ejecuta cierre de sesion", () => {
  const logout = jest.fn();
  render(<AdminPanel logout={logout} />);
  fireEvent.click(document.querySelector(".notification-bell"));
  expect(screen.getByText(/No hay notificaciones/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/i }));
  expect(logout).toHaveBeenCalledTimes(1);
});
