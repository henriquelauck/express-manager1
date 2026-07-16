import { executarEtapa } from "@/core/ia/agente/executarEtapa";
import { registrarExemploAtendimento } from "@/core/ia/aprendizado/registrarExemploAtendimento";
import { decidirFluxoMensagem } from "@/core/ia/atendimento/decidirFluxoMensagem";
import { gerarPlanoOperacional } from "@/core/ia/atendimento/gerarPlanoOperacional";
import { gerarRespostaAtendimento } from "@/core/ia/atendimento/gerarRespostaAtendimento";
import { processarAtendimento } from "@/core/ia/atendimento/processarAtendimento";
import {
  buscarAtendimentoAtivo,
  salvarAtendimento,
} from "@/core/ia/atendimento/repositorio/atendimentoRepository";
import { criarAtendimentoVazio } from "@/core/ia/atendimento/sessao/Atendimento";
import { gerarDecisoes } from "@/core/ia/gerarDecisoes";
import { gerarPendenciasOperacionais } from "@/core/ia/gerarPendenciasOperacionais";
import { resolverLocalRecorrente } from "@/core/ia/historico/resolverLocalRecorrente";
import {
  ErroEntradaPipelineIA,
  normalizarEntradaPipelineIA,
} from "@/core/ia/pipeline/normalizarEntrada";
import { resolverContextoParadas } from "@/core/ia/resolverContextoParadas";
import { escolherMotoboyIdeal } from "@/core/logistica/escolherMotoboy";
import { resolverClientes, resolverSolicitante } from "@/core/reconhecimento";
import { interpretarPedido } from "@/lib/ai/interpretarPedido";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type StatusPropostaOperacional =
  "PRONTA_PARA_REVISAO" | "NECESSITA_CONFIRMACAO" | "DADOS_INSUFICIENTES";

type OrigemSolicitante = "TELEFONE_REMETENTE" | "MENSAGEM" | null;

function normalizarTelefone(telefone: string | null | undefined) {
  const numeros = String(telefone ?? "").replace(/\D/g, "");

  if (!numeros) {
    return "";
  }

  if (numeros.startsWith("55") && numeros.length >= 12) {
    return numeros.slice(2);
  }

  return numeros;
}

function telefonesCorrespondem(telefoneA: string, telefoneB: string) {
  const normalizadoA = normalizarTelefone(telefoneA);

  const normalizadoB = normalizarTelefone(telefoneB);

  if (!normalizadoA || !normalizadoB) {
    return false;
  }

  if (normalizadoA === normalizadoB) {
    return true;
  }

  /*
   * Permite comparar números salvos com ou sem:
   * - código do Brasil 55
   * - DDD
   * - nono dígito
   *
   * A comparação pelos últimos oito dígitos deve ser
   * usada apenas como compatibilidade temporária.
   */
  const ultimosOitoA = normalizadoA.slice(-8);
  const ultimosOitoB = normalizadoB.slice(-8);

  return ultimosOitoA.length === 8 && ultimosOitoA === ultimosOitoB;
}

function calcularMedia(valores: number[]) {
  if (valores.length === 0) {
    return 0;
  }

  const soma = valores.reduce((total, valor) => total + valor, 0);

  return soma / valores.length;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const { mensagem, telefoneRemetente } = normalizarEntradaPipelineIA(body);

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

    const clientePeloTelefone = telefoneRemetente
      ? clientes.find((cliente) => telefonesCorrespondem(telefoneRemetente, cliente.telefone ?? ""))
      : null;

    const atendimentoExistente = telefoneRemetente
      ? await buscarAtendimentoAtivo({
          telefoneRemetente,
          canal: "SIMULADOR",
        })
      : null;

    const atendimentoInicial =
      atendimentoExistente ??
      criarAtendimentoVazio({
        id: crypto.randomUUID(),
        telefoneRemetente,
      });

    const decisaoFluxo = decidirFluxoMensagem({
      atendimento: atendimentoExistente,
      mensagem,
    });

    const pedido =
      decisaoFluxo.tipo === "CONTINUAR_ATENDIMENTO"
        ? {
            intencao: atendimentoInicial.operacao.intencao ?? "DESCONHECIDO",

            solicitante: atendimentoInicial.operacao.solicitante,

            paradas: [],

            precisaHumano: false,

            informacoesFaltantes: [],
          }
        : await interpretarPedido(mensagem, {
            clientes: nomesClientes,
            clientesReconhecidos: [],
          });

    const solicitantePelaMensagem = resolverSolicitante(pedido.solicitante, nomesClientes);

    const solicitanteResolvido = clientePeloTelefone
      ? {
          nome: clientePeloTelefone.nome,
          score: 1,
          confiavel: true,
        }
      : solicitantePelaMensagem;

    const nomeSolicitanteResolvido = solicitanteResolvido?.confiavel
      ? solicitanteResolvido.nome
      : null;

    const paradasComContexto = resolverContextoParadas(pedido.paradas, nomeSolicitanteResolvido);

    const clientesResolvidos = resolverClientes(
      paradasComContexto.map((parada) => parada.texto),
      nomesClientes
    );

    const origemSolicitante: OrigemSolicitante = clientePeloTelefone
      ? "TELEFONE_REMETENTE"
      : solicitantePelaMensagem?.confiavel
        ? "MENSAGEM"
        : null;

    const informacoesFaltantes = pedido.informacoesFaltantes.filter((item) => {
      if (!solicitanteResolvido?.confiavel) {
        return true;
      }

      const itemNormalizado = item.trim().toLowerCase();

      return !itemNormalizado.includes("solicitante");
    });

    const paradasResolvidas = await Promise.all(
      paradasComContexto.map(async (parada, index) => {
        const resolucaoCadastro = clientesResolvidos[index];

        const clienteReconhecido = resolucaoCadastro?.encontrado;

        if (clienteReconhecido?.confiavel) {
          return {
            tipo: parada.tipo,

            texto: parada.texto,

            textoOriginal: parada.textoOriginal,

            resolvidaPorContexto: parada.resolvidaPorContexto,

            motivoContexto: parada.motivoContexto,

            cliente: clienteReconhecido.nome,

            confianca: clienteReconhecido.score,

            enderecoHistorico: null,

            telefoneHistorico: null,

            origemResolucao: "CADASTRO_CLIENTE" as const,

            quantidadeUsosHistorico: 0,

            motivoHistorico: null,
          };
        }

        if (nomeSolicitanteResolvido) {
          const tipoHistorico =
            parada.tipo === "COLETA" || parada.tipo === "ENTREGA" ? parada.tipo : undefined;

          const localRecorrente = await resolverLocalRecorrente({
            solicitante: nomeSolicitanteResolvido,

            textoLocal: parada.texto,

            tipo: tipoHistorico,
          });

          if (localRecorrente.encontrado && localRecorrente.cliente && localRecorrente.endereco) {
            return {
              tipo: parada.tipo,

              texto: parada.texto,

              textoOriginal: parada.textoOriginal,

              resolvidaPorContexto: true,

              motivoContexto: localRecorrente.motivo,

              cliente: localRecorrente.cliente,

              confianca: localRecorrente.confianca,

              enderecoHistorico: localRecorrente.endereco,

              telefoneHistorico: localRecorrente.telefone,

              origemResolucao: "HISTORICO_SOLICITANTE" as const,

              quantidadeUsosHistorico: localRecorrente.quantidadeUsos,

              motivoHistorico: localRecorrente.motivo,
            };
          }
        }

        informacoesFaltantes.push(
          `Cliente ou local "${parada.texto}" não identificado com segurança.`
        );

        return {
          tipo: parada.tipo,

          texto: parada.texto,

          textoOriginal: parada.textoOriginal,

          resolvidaPorContexto: parada.resolvidaPorContexto,

          motivoContexto: parada.motivoContexto,

          cliente: null,

          confianca: clienteReconhecido?.score ?? 0,

          enderecoHistorico: null,

          telefoneHistorico: null,

          origemResolucao: "NAO_RESOLVIDO" as const,

          quantidadeUsosHistorico: 0,

          motivoHistorico: null,
        };
      })
    );

    const paradasEnriquecidas = paradasResolvidas.map((parada) => {
      if (!parada.cliente) {
        return {
          ...parada,

          endereco: null,

          enderecoAlternativo: null,

          telefone: null,
        };
      }

      /*
       * Quando o histórico específico do solicitante
       * encontrou o endereço, ele tem prioridade.
       */
      if (parada.enderecoHistorico) {
        return {
          ...parada,

          endereco: parada.enderecoHistorico,

          enderecoAlternativo: null,

          telefone: parada.telefoneHistorico ?? null,
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

    const solicitanteInformadoNaMensagem = Boolean(pedido.solicitante);

    const solicitanteNaoResolvido = !solicitanteResolvido?.confiavel;

    if (telefoneRemetente && !clientePeloTelefone && !solicitantePelaMensagem?.confiavel) {
      informacoesFaltantes.push(
        `O telefone do remetente "${telefoneRemetente}" não está vinculado a nenhum cliente cadastrado.`
      );
    }

    if (!telefoneRemetente && !solicitanteInformadoNaMensagem) {
      informacoesFaltantes.push("Telefone do remetente não informado.");
    }

    if (
      solicitanteInformadoNaMensagem &&
      !clientePeloTelefone &&
      !solicitantePelaMensagem?.confiavel
    ) {
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

    const pendenciasOperacionais = gerarPendenciasOperacionais({
      intencao: pedido.intencao,

      solicitante: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

      origemSolicitante,

      telefoneRemetente,

      telefoneVinculadoAoCliente: Boolean(clientePeloTelefone),

      paradas: paradasEnriquecidas,
    });

    const precisaHumano = pendenciasOperacionais.length > 0;

    const confiancas = paradasEnriquecidas.map((parada) => parada.confianca);

    if (solicitanteResolvido?.confiavel) {
      confiancas.push(solicitanteResolvido.score);
    }

    const confiancaGeral = calcularMedia(confiancas);

    let statusProposta: StatusPropostaOperacional = "PRONTA_PARA_REVISAO";

    if (pedido.intencao !== "CRIAR_TELE" || paradasEnriquecidas.length === 0) {
      statusProposta = "DADOS_INSUFICIENTES";
    } else if (pendenciasOperacionais.length > 0) {
      statusProposta = "NECESSITA_CONFIRMACAO";
    }

    const avisos: string[] = [];

    const paradasResolvidasPorContexto = paradasComContexto.filter(
      (parada) => parada.resolvidaPorContexto
    );

    for (const parada of paradasResolvidasPorContexto) {
      if (parada.motivoContexto) {
        avisos.push(parada.motivoContexto);
      }
    }

    const possuiEnderecoAlternativo = paradasEnriquecidas.some((parada) =>
      Boolean(parada.enderecoAlternativo)
    );

    if (possuiEnderecoAlternativo) {
      avisos.push("Existe pelo menos uma parada com endereço alternativo cadastrado.");
    }

    if (sugestaoMotoboy.motoboy) {
      avisos.push("O motoboy foi apenas sugerido e ainda não foi atribuído à tele.");
    }

    if (origemSolicitante === "TELEFONE_REMETENTE") {
      avisos.push("O solicitante foi identificado pelo telefone do remetente.");
    }

    const motoboySugerido = sugestaoMotoboy.motoboy
      ? {
          nome: sugestaoMotoboy.motoboy.nome,

          score: sugestaoMotoboy.score,

          motivo: sugestaoMotoboy.motivo,
        }
      : null;

    const decisoes = gerarDecisoes({
      intencao: pedido.intencao,

      solicitanteInformado: telefoneRemetente || pedido.solicitante,

      solicitanteReconhecido: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

      confiancaSolicitante: solicitanteResolvido?.score ?? 0,

      paradas: paradasEnriquecidas,

      motoboySugerido,
    });

    const processamentoAtendimento = await processarAtendimento({
      atendimento: atendimentoInicial,

      mensagemCliente: mensagem,

      resultadoInterpretacao: {
        intencao: pedido.intencao,

        solicitante: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

        origemSolicitante,

        paradas: paradasEnriquecidas.map((parada) => ({
          tipo: parada.tipo,

          texto: parada.texto,

          textoOriginal: parada.textoOriginal,

          cliente: parada.cliente,

          endereco: parada.endereco,

          telefone: parada.telefone,

          confianca: parada.confianca,

          resolvidaPorContexto: parada.resolvidaPorContexto,
        })),
      },

      respostaAgente: undefined,
    });

    const atendimentoProcessado = processamentoAtendimento.atendimento;

    const atendimento = telefoneRemetente
      ? await salvarAtendimento({
          atendimento: atendimentoProcessado,
          canal: "SIMULADOR",
        })
      : atendimentoProcessado;

    const resultadoExecucao = await executarEtapa(atendimento);

    const atendimentoFinal = resultadoExecucao.atendimento;

    const atendimentoPersistidoFinal = telefoneRemetente
      ? await salvarAtendimento({
          atendimento: atendimentoFinal,
          canal: "SIMULADOR",
        })
      : atendimentoFinal;
    const paradasOperacionaisFinais = atendimentoFinal.operacao.paradas.map((parada) => ({
      tipo: parada.tipo,

      texto: parada.textoOriginal ?? parada.cliente ?? "",

      textoOriginal: parada.textoOriginal,

      cliente: parada.cliente,

      endereco: parada.endereco,

      telefone: parada.telefone,

      confianca: parada.confianca,

      resolvidaPorContexto:
        parada.origem === "CONTEXTO_OPERACIONAL" || parada.origem === "HISTORICO_SOLICITANTE",
    }));

    const pendenciasOperacionaisFinais = gerarPendenciasOperacionais({
      intencao: atendimentoFinal.operacao.intencao ?? "DESCONHECIDO",

      solicitante: atendimentoFinal.operacao.solicitante,

      origemSolicitante: atendimentoFinal.operacao.origemSolicitante,

      telefoneRemetente,

      telefoneVinculadoAoCliente: Boolean(clientePeloTelefone),

      paradas: paradasOperacionaisFinais,
    });

    const precisaHumanoFinal = pendenciasOperacionaisFinais.length > 0;

    let statusPropostaFinal: StatusPropostaOperacional = "PRONTA_PARA_REVISAO";

    if (
      atendimentoFinal.operacao.intencao !== "CRIAR_TELE" ||
      atendimentoFinal.operacao.paradas.length === 0
    ) {
      statusPropostaFinal = "DADOS_INSUFICIENTES";
    } else if (pendenciasOperacionaisFinais.length > 0) {
      statusPropostaFinal = "NECESSITA_CONFIRMACAO";
    }

    const respostaAtendimento = gerarRespostaAtendimento({
      atendimento: atendimentoPersistidoFinal,
    });

    const planoAgente = gerarPlanoOperacional({
      atendimento: atendimentoPersistidoFinal,
    });

    const propostaOperacional = {
      status: statusPropostaFinal,

      confiancaGeral,
      respostaAtendimento,
      planoAgente,
      atendimento: atendimentoPersistidoFinal,

      solicitante: {
        informado: telefoneRemetente || pedido.solicitante,

        reconhecido: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

        confianca: solicitanteResolvido?.score ?? 0,

        origem: origemSolicitante,

        telefoneRemetente: telefoneRemetente || null,
      },

      paradas: paradasOperacionaisFinais,

      motoboySugerido,

      decisoes,

      pendencias: pendenciasOperacionaisFinais,

      avisos,

      podeCriarRascunho: statusPropostaFinal === "PRONTA_PARA_REVISAO",

      podeExecutarAutomaticamente: false,
    };

    const pedidoFinal = {
      ...pedido,

      intencao: atendimentoFinal.operacao.intencao ?? "DESCONHECIDO",

      solicitante: solicitanteResolvido?.confiavel ? solicitanteResolvido.nome : null,

      origemSolicitante,

      atendimento: atendimentoPersistidoFinal,

      execucaoAutomatica: resultadoExecucao,

      processamentoAtendimento: {
        estadoAnterior: processamentoAtendimento.estadoAnterior,

        estadoAtual: processamentoAtendimento.estadoAtual,

        alterouEtapa: processamentoAtendimento.alterouEtapa,
      },

      respostaAtendimento,

      planoAgente,

      telefoneRemetente: telefoneRemetente || null,

      motoboySugerido,

      confiancaSolicitante: solicitanteResolvido?.score ?? 0,

      paradas: paradasOperacionaisFinais,

      precisaHumano: precisaHumanoFinal,

      /*
       * Mantemos o nome antigo no retorno para não quebrar
       * a interface atual.
       */
      informacoesFaltantes: pendenciasOperacionaisFinais,

      decisoes,

      propostaOperacional,
    };

    await registrarExemploAtendimento({
      atendimentoId: atendimentoPersistidoFinal.id,

      teleId: atendimentoPersistidoFinal.operacao.teleId,

      telefoneRemetente: telefoneRemetente || "",

      solicitante: atendimentoPersistidoFinal.operacao.solicitante,

      mensagemCliente: mensagem,

      interpretacaoIA: {
        intencao: pedido.intencao,

        solicitanteInformado: pedido.solicitante,

        paradasInterpretadas: pedido.paradas,

        precisaHumano: pedido.precisaHumano,

        informacoesFaltantes: pedido.informacoesFaltantes,
      },

      sugestaoIA: {
        respostaAtendimento,

        planoAgente,

        propostaOperacional: {
          status: propostaOperacional.status,

          paradas: propostaOperacional.paradas,

          pendencias: propostaOperacional.pendencias,

          avisos: propostaOperacional.avisos,

          motoboySugerido: propostaOperacional.motoboySugerido,
        },
      },

      operacaoFinal: {
        atendimentoId: atendimentoPersistidoFinal.id,

        estado: atendimentoPersistidoFinal.estado,

        status: atendimentoPersistidoFinal.status,

        operacao: atendimentoPersistidoFinal.operacao,

        execucao: {
          executou: resultadoExecucao.executou,

          etapaExecutada: resultadoExecucao.etapaExecutada,

          mensagem: resultadoExecucao.mensagem ?? null,
        },
      },
    });

    return NextResponse.json(pedidoFinal);
  } catch (error) {
    console.error("ERRO AO INTERPRETAR PEDIDO:", error);
    if (error instanceof ErroEntradaPipelineIA) {
      return NextResponse.json(
        {
          erro: error.message,
        },
        {
          status: error.status,
        }
      );
    }

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
