import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuditorPanel from "../auditorPanel";

jest.mock("../listaAuditorias", () => () => <div>Vista Mis auditorías</div>);
jest.mock("../nuevaAuditoria", () => () => <div>Vista Nueva auditoría</div>);
jest.mock("../reclamoInforme", () => () => <div>Vista Reclamos</div>);
jest.mock("../reportesAuditorias", () => () => <div>Vista Reportes</div>);

test("navega entre secciones del panel auditor", () => {
  render(<AuditorPanel logout={jest.fn()} />);

  expect(screen.getByText("Vista Mis auditorías")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Nueva auditoría\/evaluación/i }));
  expect(screen.getByText("Vista Nueva auditoría")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Reclamos / Informes" }));
  expect(screen.getByText("Vista Reclamos")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Reportes" }));
  expect(screen.getByText("Vista Reportes")).toBeInTheDocument();
});

test("ejecuta logout desde el panel auditor", () => {
  const logout = jest.fn();
  render(<AuditorPanel logout={logout} />);

  fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

  expect(logout).toHaveBeenCalled();
});
