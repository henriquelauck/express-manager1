import { reconhecerClientesNaMensagem } from "./reconhecerCliente";

export function resolverClientes(textos: string[], clientes: string[]) {
  return textos.map((texto) => {
    const resultado = reconhecerClientesNaMensagem(texto, clientes);

    if (resultado.length === 0) {
      return {
        original: texto,
        encontrado: null,
      };
    }

    return {
      original: texto,
      encontrado: resultado[0],
    };
  });
}
