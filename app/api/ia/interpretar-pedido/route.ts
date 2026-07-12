import { escolherMotoboyIdeal } from "@/core/logistica/escolherMotoboy";
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

    const motoboys = await prisma.motoboy.findMany();

    const teles = await prisma.tele.findMany({
      include: {
        motoboy: true,
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

    const motoboysParaCore = motoboys.map((motoboy) => ({
      id: motoboy.id,
      nome: motoboy.nome,
      telefone: motoboy.telefone || "",
      moto: motoboy.moto || "",
      placa: motoboy.placa || "",
    }));

    const statusParaCore = {
      AGUARDANDO_CLIENTE: "Aguardando cliente",
      AGUARDANDO_MOTOBOY: "Aguardando motoboy disponível",
      EM_ROTA: "Em rota",
      ENTREGUE: "Entregue",
    } as const;

    const telesParaCore = teles.map((tele) => ({
      id: tele.id,

      solicitante: tele.solicitante,

      motoboyId: tele.motoboyId,
      motoboy: tele.motoboyNome || tele.motoboy?.nome || "",

      status: statusParaCore[tele.status],

      criadoEm: tele.createdAt.toISOString(),
      dataTele: tele.dataTele.toISOString(),

      valorBase: tele.valorBase,
      retorno: tele.retorno,
      espera: tele.espera,
      total: tele.total,

      recebido: tele.recebimento !== "PENDENTE",

      recebimento: tele.recebimento.toLowerCase() as "pendente" | "escritorio" | "motoboy",

      formaCobranca: tele.formaCobranca.toLowerCase() as
        "na_hora" | "semanal" | "quinzenal" | "mensal",

      valorRecebido: tele.valorRecebido,
      dataRecebimento: tele.dataRecebimento?.toISOString() || null,

      motoboyRecebedor: tele.motoboyRecebedor,
      fechamentoId: tele.fechamentoId,

      observacaoGeral: tele.observacaoGeral || "",

      paradas: [],

      tipoRota: tele.tipoRota,
      nomeCliente: "",
      endereco: "",
      contato: "",
      observacao: "",
      valor: tele.total.toFixed(2).replace(".", ","),
      esperaMinutos: 0,
    }));

    const sugestaoMotoboy = escolherMotoboyIdeal(motoboysParaCore, telesParaCore);

    const pedidoFinal = {
      ...pedido,

      solicitante: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

      motoboySugerido: sugestaoMotoboy.motoboy
        ? {
            nome: sugestaoMotoboy.motoboy.nome,
            score: sugestaoMotoboy.score,
            motivo: sugestaoMotoboy.motivo,
          }
        : null,

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
