import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Login from "../login";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
  process.env.REACT_APP_API_URL = "http://api.test";
});

test("inicia sesion, guarda token y rol", async () => {
  const setRol = jest.fn();
  const setToken = jest.fn();

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      token: "token-qa",
      user: { rol: "admin" },
    }),
  });

  render(<Login onSwitch={jest.fn()} setRol={setRol} setToken={setToken} />);

  fireEvent.change(screen.getByPlaceholderText("Correo electrónico"), {
    target: { value: "qa@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
    target: { value: "ClaveTest1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

  await waitFor(() => expect(setToken).toHaveBeenCalledWith("token-qa"));

  expect(setRol).toHaveBeenCalledWith("admin");
  expect(localStorage.getItem("token")).toBe("token-qa");
  expect(localStorage.getItem("rol")).toBe("admin");
  expect(fetch).toHaveBeenCalledWith(
    "http://api.test/api/auth/login",
    expect.objectContaining({ method: "POST" })
  );
});

test("muestra error cuando las credenciales fallan", async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message: "Credenciales inválidas" }),
  });

  render(<Login onSwitch={jest.fn()} setRol={jest.fn()} setToken={jest.fn()} />);

  fireEvent.change(screen.getByPlaceholderText("Correo electrónico"), {
    target: { value: "qa@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
    target: { value: "mal" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

  expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
});

test("permite navegar a solicitud de cuenta nueva", () => {
  const onSwitch = jest.fn();

  render(<Login onSwitch={onSwitch} setRol={jest.fn()} setToken={jest.fn()} />);

  fireEvent.click(screen.getByText("Solicitar cuenta nueva"));

  expect(onSwitch).toHaveBeenCalled();
});
