import type { Cliente } from "@/types/Cliente";
import type { Tele } from "@/types/Tele";

export function obterEnderecosSugestoes(clientes: Cliente[], teles: Tele[]): string[] {
  return Array.from(
    new Set([
      ...clientes.flatMap((cliente) => [cliente.endereco1, cliente.endereco2].filter(Boolean)),

      ...teles.flatMap((tele) =>
        (tele.paradas || []).map((parada) => parada.endereco).filter(Boolean)
      ),
    ])
  ).sort();
}
