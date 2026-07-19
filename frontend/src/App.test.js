import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

jest.mock("./componentes/login", () => ({ onSwitch, setRol, setToken }) => (
  <div><span>Vista Login</span><button onClick={onSwitch}>Registro</button><button onClick={() => { global.localStorage.setItem("token", "t"); global.localStorage.setItem("rol", "auditor"); setToken("t"); setRol("auditor"); }}>Entrar auditor</button></div>
));
jest.mock("./componentes/registro", () => ({ onSwitch }) => <div><span>Vista Registro</span><button onClick={onSwitch}>Volver login</button></div>);
jest.mock("./componentes/adminPanel", () => ({ logout }) => <div><span>Vista Admin</span><button onClick={logout}>Salir admin</button></div>);
jest.mock("./componentes/auditorPanel", () => ({ logout }) => <div><span>Vista Auditor</span><button onClick={logout}>Salir auditor</button></div>);

beforeEach(() => localStorage.clear());

test("alterna entre ingreso y solicitud de cuenta", () => {
  render(<App />);
  expect(screen.getByText("Vista Login")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Registro" }));
  expect(screen.getByText("Vista Registro")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Volver login/i }));
  expect(screen.getByText("Vista Login")).toBeInTheDocument();
});

test("enruta por rol y limpia la sesion al salir", () => {
  localStorage.setItem("token", "admin-token");
  localStorage.setItem("rol", "admin");
  const { unmount } = render(<App />);
  expect(screen.getByText("Vista Admin")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Salir admin/i }));
  expect(screen.getByText("Vista Login")).toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
  unmount();

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /Entrar auditor/i }));
  expect(screen.getByText("Vista Auditor")).toBeInTheDocument();
});
