import type { Cliente } from "@/types/Cliente";
import type { Parada } from "@/types/Parada";

type LocalFrequente = {
  cliente: string;
  endereco: string;
  contato: string;
};

export function atualizarParadaService(
  paradas: Parada[],
  clientes: Cliente[],
  locaisFrequentes: LocalFrequente[],
  index: number,
  campo: keyof Parada,
  valor: string
): Parada[] {
  const novasParadas = [...paradas];

  novasParadas[index] = {
    ...novasParadas[index],
    [campo]: valor,
  };

  if (campo !== "cliente") {
    return novasParadas;
  }

  const clienteEncontrado = clientes.find(
    (cliente) => cliente.nome.toLowerCase() === valor.toLowerCase()
  );

  if (clienteEncontrado) {
    novasParadas[index].endereco = clienteEncontrado.endereco1 || "";

    novasParadas[index].contato = clienteEncontrado.telefone || "";
  }

  const local = locaisFrequentes.find((item) => item.cliente.toLowerCase() === valor.toLowerCase());

  if (local) {
    novasParadas[index].endereco = local.endereco || "";

    novasParadas[index].contato = local.contato || "";
  }

  return novasParadas;
}
