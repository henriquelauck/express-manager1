import { resolverClientes, resolverSolicitante } from "@/core/reconhecimento";
import { interpretarPedido } from "@/lib/ai/interpretarPedido";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body.mensagem !== "string" || !body.mensagem.trim()) {
      return NextResponse.json(
        {
          erro: "Mensagem não informada.",
        },
        {
          status: 400,
        }
      );
    }

    const mensagem = body.mensagem.trim();

    const clientes = await prisma.cliente.findMany({
      select: {
        nome: true,
        telefone: true,
        endereco1: true,
        endereco2: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    const nomesClientes = clientes.map((cliente) => cliente.nome);

    const pedido = await interpretarPedido(mensagem, {
      clientes: nomesClientes,
      clientesReconhecidos: [],
    });

    const clientesResolvidos = resolverClientes(
      pedido.paradas.map((parada) => parada.texto),
      nomesClientes
    );

    const solicitanteResolvido = resolverSolicitante(pedido.solicitante, nomesClientes);

    const informacoesFaltantes = [...pedido.informacoesFaltantes];

    const paradasResolvidas = pedido.paradas.map((parada, index) => {
      const resolucao = clientesResolvidos[index];
      const clienteReconhecido = resolucao?.encontrado;

      if (!clienteReconhecido?.confiavel) {
        informacoesFaltantes.push(`Cliente "${parada.texto}" não identificado com segurança.`);
      }

      return {
        tipo: parada.tipo,
        texto: parada.texto,
        cliente: clienteReconhecido?.confiavel ? clienteReconhecido.nome : null,
        confianca: clienteReconhecido?.score ?? 0,
      };
    });

    const paradasEnriquecidas = paradasResolvidas.map((parada) => {
      if (!parada.cliente) {
        return {
          ...parada,
          endereco: null,
          enderecoAlternativo: null,
          telefone: null,
        };
      }

      const clienteEncontrado = clientes.find(
        (cliente) => cliente.nome.trim().toLowerCase() === parada.cliente?.trim().toLowerCase()
      );

      if (!clienteEncontrado?.endereco1) {
        informacoesFaltantes.push(
          `O cliente "${parada.cliente}" não possui endereço principal cadastrado.`
        );
      }

      return {
        ...parada,
        endereco: clienteEncontrado?.endereco1 ?? null,
        enderecoAlternativo: clienteEncontrado?.endereco2 ?? null,
        telefone: clienteEncontrado?.telefone ?? null,
      };
    });

    const possuiClienteNaoResolvido = paradasResolvidas.some((parada) => !parada.cliente);

    const possuiEnderecoNaoResolvido = paradasEnriquecidas.some((parada) => !parada.endereco);

    const solicitanteNaoResolvido = Boolean(pedido.solicitante) && !solicitanteResolvido?.confiavel;

    if (solicitanteNaoResolvido) {
      informacoesFaltantes.push(
        `Solicitante "${pedido.solicitante}" não identificado com segurança.`
      );
    }

    const pedidoFinal = {
      ...pedido,

      solicitante: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

      confiancaSolicitante: solicitanteResolvido?.score ?? 0,

      paradas: paradasEnriquecidas,

      precisaHumano:
        pedido.precisaHumano ||
        possuiClienteNaoResolvido ||
        possuiEnderecoNaoResolvido ||
        solicitanteNaoResolvido,

      informacoesFaltantes: Array.from(new Set(informacoesFaltantes)),
    };

    return NextResponse.json(pedidoFinal);
  } catch (error) {
    console.error("ERRO AO INTERPRETAR PEDIDO:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao interpretar pedido.",
      },
      {
        status: 500,
      }
    );
  }
}
