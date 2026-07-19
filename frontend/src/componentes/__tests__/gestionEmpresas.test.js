import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GestionEmpresas from "../gestionEmpresas";

beforeEach(() => {
  localStorage.setItem("token", "token-qa");
  global.fetch = jest.fn();
  window.confirm = jest.fn(() => true);
  process.env.REACT_APP_API_URL = "http://api.test";
});

test("crea una empresa y recarga el listado", async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Empresa creada correctamente" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 2, nombre: "Empresa QA", direccion: "Centro" }],
    });

  render(<GestionEmpresas logout={jest.fn()} />);

  await screen.findByText("No hay empresas registradas");

  fireEvent.change(screen.getByPlaceholderText("Nombre de la empresa"), {
    target: { value: "Empresa QA" },
  });
  fireEvent.change(screen.getByPlaceholderText("Dirección / ubicación"), {
    target: { value: "Centro" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Nueva" }));

  await screen.findByText("Empresa QA");

  expect(fetch.mock.calls[1][0]).toBe("http://api.test/api/empresas");
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: "POST" });
});

test("actualiza y elimina empresas sin tocar usuarios admin", async () => {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, nombre: "Empresa Vieja", direccion: "A" }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Empresa actualizada correctamente" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, nombre: "Empresa Nueva", direccion: "B" }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Empresa desactivada correctamente" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

  render(<GestionEmpresas logout={jest.fn()} />);

  await screen.findByText("Empresa Vieja");

  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  fireEvent.change(screen.getByPlaceholderText("Nombre de la empresa"), {
    target: { value: "Empresa Nueva" },
  });
  fireEvent.change(screen.getByPlaceholderText("Dirección / ubicación"), {
    target: { value: "B" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

  await screen.findByText("Empresa Nueva");

  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

  await waitFor(() => {
    expect(fetch.mock.calls[3][0]).toBe("http://api.test/api/empresas/1");
  });
  expect(fetch.mock.calls[3][1].method).toBe("DELETE");
  expect(window.confirm).toHaveBeenCalled();
});
