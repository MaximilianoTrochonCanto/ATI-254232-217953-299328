import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Register from "../registro";

beforeEach(() => {
  global.fetch = jest.fn();
  process.env.REACT_APP_API_URL = "http://api.test";
});

function mockEmpresas() {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 8, nombre: "Empresa QA" }],
  });
}

test("valida campos obligatorios antes de enviar registro", async () => {
  mockEmpresas();

  render(<Register onSwitch={jest.fn()} />);

  await screen.findByText("Empresa QA");
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

  expect(await screen.findByText("Todos los campos son obligatorios.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("envia solicitud de registro con empresa numerica", async () => {
  mockEmpresas();
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      message: "Solicitud enviada correctamente.",
    }),
  });

  render(<Register onSwitch={jest.fn()} />);

  await screen.findByText("Empresa QA");

  fireEvent.change(screen.getByPlaceholderText("Nombre"), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByPlaceholderText("Apellido"), {
    target: { value: "Tester" },
  });
  fireEvent.change(screen.getByPlaceholderText("Correo electrónico"), {
    target: { value: "ana.qa@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Título o cargo laboral"), {
    target: { value: "Auditora" },
  });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
    target: { value: "ClaveTest1!" },
  });
  fireEvent.change(screen.getByPlaceholderText("Repetir contraseña"), {
    target: { value: "ClaveTest1!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

  await screen.findByText("Solicitud enviada correctamente.");

  const [, request] = fetch.mock.calls;
  expect(request[0]).toBe("http://api.test/api/auth/register");
  expect(request[1].method).toBe("POST");
  expect(JSON.parse(request[1].body).empresa_id).toBe(8);
});
