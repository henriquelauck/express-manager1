import { reconhecerClientesNaMensagem } from "./reconhecerCliente";

export function resolverSolicitante(texto: string | null, clientes: string[]) {
  if (!texto) return null;

  const encontrados = reconhecerClientesNaMensagem(texto, clientes);

  return encontrados[0] ?? null;
}
