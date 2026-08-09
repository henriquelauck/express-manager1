import { prisma } from "@/lib/prisma";
import {
  normalizarEnderecoGeocodificacao,
  obterCoordenadasPersistentes,
} from "@/lib/google-maps/geocodificacaoPersistente";
import { NextResponse } from "next/server";

type TeleHistorica = {
  solicitante: string;
  dataTele: Date;
  paradas: Array<{
    tipo: string;
    endereco: string;
    ordem: number;
  }>;
};

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function limitarNumero(valor: unknown, minimo: number, maximo: number, padrao: number) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return padrao;
  }

  return Math.min(maximo, Math.max(minimo, numero));
}

function distanciaKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number
) {
  const raioTerraKm = 6371;
  const radianos = (graus: number) => (graus * Math.PI) / 180;
  const deltaLatitude = radianos(latitudeB - latitudeA);
  const deltaLongitude = radianos(longitudeB - longitudeA);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radianos(latitudeA)) *
      Math.cos(radianos(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return raioTerraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function partesBrasil(data: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(data);

  const semana: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const diaTexto = partes.find((parte) => parte.type === "weekday")?.value || "Sun";
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0);

  return {
    diaSemana: semana[diaTexto] ?? 0,
    hora,
  };
}

function faixaHorario(hora: number) {
  if (hora < 12) return "MANHA";
  if (hora < 18) return "TARDE";
  return "NOITE";
}

function destinoFinal(tele: TeleHistorica) {
  const paradas = [...tele.paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((parada) => String(parada.tipo).toUpperCase() !== "RETORNO");

  return paradas[paradas.length - 1]?.endereco?.trim() || "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const solicitanteAtual = String(body?.solicitanteAtual || "").trim();
    const enderecoDestino = String(body?.enderecoDestino || "").trim();
    const periodoDias = Math.round(limitarNumero(body?.periodoDias, 30, 365, 180));
    const raioKm = limitarNumero(body?.raioKm, 1, 30, 10);

    if (!enderecoDestino) {
      return erro("Informe o endereço do destino.");
    }

    const chaveGoogleMaps = process.env.GOOGLE_MAPS_API_KEY;

    if (!chaveGoogleMaps) {
      return erro("Chave do Google Maps não configurada.", 500);
    }

    /*
     * ÚNICO ponto desta busca que pode consultar o Google:
     * o endereço selecionado pelo gestor.
     *
     * Se ele já estiver no CacheGeocodificacao, não há chamada externa.
     */
    const destinoAtual = await obterCoordenadasPersistentes(
      enderecoDestino,
      chaveGoogleMaps,
      "OPORTUNIDADES_ENCAIXE_DESTINO"
    );

    if (!destinoAtual) {
      return erro("Não foi possível localizar o destino informado.", 422);
    }

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - periodoDias);

    const [teles, clientes] = await Promise.all([
      prisma.tele.findMany({
        where: {
          orcamento: false,
          dataTele: {
            gte: dataLimite,
          },
        },
        select: {
          solicitante: true,
          dataTele: true,
          paradas: {
            select: {
              tipo: true,
              endereco: true,
              ordem: true,
            },
            orderBy: {
              ordem: "asc",
            },
          },
        },
        orderBy: {
          dataTele: "desc",
        },
        take: 1200,
      }),
      prisma.cliente.findMany({
        select: {
          id: true,
          nome: true,
          telefone: true,
        },
      }),
    ]);

    const clientesPorNome = new Map(
      clientes.map((cliente) => [normalizarTexto(cliente.nome), cliente])
    );
    const solicitanteNormalizado = normalizarTexto(solicitanteAtual);

    const agrupadas = new Map<
      string,
      {
        clienteId: string;
        cliente: string;
        telefone: string;
        historico: Array<{
          dataTele: Date;
          endereco: string;
          enderecoNormalizado: string;
        }>;
      }
    >();

    for (const tele of teles) {
      const nomeNormalizado = normalizarTexto(tele.solicitante);

      if (!nomeNormalizado || nomeNormalizado === solicitanteNormalizado) {
        continue;
      }

      const cliente = clientesPorNome.get(nomeNormalizado);

      if (!cliente) {
        continue;
      }

      const endereco = destinoFinal(tele as TeleHistorica);
      const enderecoNormalizado = normalizarEnderecoGeocodificacao(endereco);

      if (!endereco || !enderecoNormalizado) {
        continue;
      }

      const grupo = agrupadas.get(nomeNormalizado) ?? {
        clienteId: cliente.id,
        cliente: cliente.nome,
        telefone: cliente.telefone || "",
        historico: [],
      };

      grupo.historico.push({
        dataTele: tele.dataTele,
        endereco,
        enderecoNormalizado,
      });

      agrupadas.set(nomeNormalizado, grupo);
    }

    /*
     * NOVA LÓGICA:
     * os endereços históricos NÃO são geocodificados nesta pesquisa.
     *
     * A busca apenas lê coordenadas já conhecidas no CacheGeocodificacao.
     * Portanto, não existe multiplicação de chamadas ao Google por quantidade
     * de teles/clientes históricos.
     */
    const enderecosHistoricosNormalizados = Array.from(
      new Set(
        Array.from(agrupadas.values()).flatMap((grupo) =>
          grupo.historico.map((item) => item.enderecoNormalizado)
        )
      )
    );

    const coordenadasSalvas =
      enderecosHistoricosNormalizados.length > 0
        ? await prisma.cacheGeocodificacao.findMany({
            where: {
              enderecoNormalizado: {
                in: enderecosHistoricosNormalizados,
              },
            },
            select: {
              enderecoNormalizado: true,
              enderecoOriginal: true,
              enderecoFormatado: true,
              latitude: true,
              longitude: true,
            },
          })
        : [];

    const coordenadasPorEndereco = new Map(
      coordenadasSalvas.map((item) => [
        item.enderecoNormalizado,
        {
          latitude: item.latitude,
          longitude: item.longitude,
          enderecoFormatado: item.enderecoFormatado || item.enderecoOriginal,
        },
      ])
    );

    const dataReferencia = body?.dataReferencia
      ? new Date(`${String(body.dataReferencia)}T12:00:00-03:00`)
      : new Date();

    const referencia = partesBrasil(
      Number.isNaN(dataReferencia.getTime()) ? new Date() : dataReferencia
    );
    const faixaReferencia = faixaHorario(partesBrasil(new Date()).hora);

    let clientesComHistoricoLocalizado = 0;

    const oportunidades = Array.from(agrupadas.values())
      .map((grupo) => {
        const registrosLocalizados = grupo.historico
          .map((item) => {
            const coordenada = coordenadasPorEndereco.get(item.enderecoNormalizado);

            if (!coordenada) {
              return null;
            }

            return {
              ...item,
              distanciaKm: distanciaKm(
                destinoAtual.latitude,
                destinoAtual.longitude,
                coordenada.latitude,
                coordenada.longitude
              ),
            };
          })
          .filter(
            (
              item
            ): item is {
              dataTele: Date;
              endereco: string;
              enderecoNormalizado: string;
              distanciaKm: number;
            } => Boolean(item)
          );

        if (registrosLocalizados.length > 0) {
          clientesComHistoricoLocalizado += 1;
        }

        const registrosProximos = registrosLocalizados.filter(
          (item) => item.distanciaKm <= raioKm
        );

        if (registrosProximos.length === 0) {
          return null;
        }

        const mesmaSemana = registrosProximos.filter(
          (item) => partesBrasil(item.dataTele).diaSemana === referencia.diaSemana
        ).length;

        const mesmaFaixa = registrosProximos.filter(
          (item) => faixaHorario(partesBrasil(item.dataTele).hora) === faixaReferencia
        ).length;

        const ultimaTele = registrosProximos.reduce<Date | null>(
          (maisRecente, item) =>
            !maisRecente || item.dataTele > maisRecente ? item.dataTele : maisRecente,
          null
        );

        const diasDesdeUltima = ultimaTele
          ? Math.max(0, (Date.now() - ultimaTele.getTime()) / 86400000)
          : periodoDias;

        const frequencia = Math.min(45, registrosProximos.length * 9);
        const diaSemana = Math.min(20, mesmaSemana * 6);
        const horario = Math.min(15, mesmaFaixa * 5);
        const recencia =
          diasDesdeUltima <= 7
            ? 20
            : diasDesdeUltima <= 30
              ? 14
              : diasDesdeUltima <= 90
                ? 8
                : 3;

        const probabilidade = Math.round(
          Math.min(95, Math.max(12, frequencia + diaSemana + horario + recencia))
        );

        const menorDistancia = Math.min(
          ...registrosProximos.map((item) => item.distanciaKm)
        );

        const motivos = [
          `${registrosProximos.length} ${
            registrosProximos.length === 1
              ? "entrega próxima"
              : "entregas próximas"
          } no período`,
          mesmaSemana > 0 ? `${mesmaSemana} no mesmo dia da semana` : "",
          mesmaFaixa > 0 ? `${mesmaFaixa} na mesma faixa de horário` : "",
          diasDesdeUltima <= 30 ? "atividade recente nessa região" : "",
        ].filter(Boolean);

        return {
          clienteId: grupo.clienteId,
          cliente: grupo.cliente,
          telefone: grupo.telefone,
          probabilidade,
          distanciaKm: Number(menorDistancia.toFixed(1)),
          quantidadeHistorico: grupo.historico.length,
          quantidadeRegiao: registrosProximos.length,
          ultimaTeleEm: ultimaTele?.toISOString() || null,
          destinosExemplo: Array.from(
            new Set(
              registrosProximos
                .sort((a, b) => a.distanciaKm - b.distanciaKm)
                .map((item) => item.endereco)
            )
          ).slice(0, 3),
          motivos,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        if (b.probabilidade !== a.probabilidade) {
          return b.probabilidade - a.probabilidade;
        }

        if (b.quantidadeRegiao !== a.quantidadeRegiao) {
          return b.quantidadeRegiao - a.quantidadeRegiao;
        }

        return a.distanciaKm - b.distanciaKm;
      })
      .slice(0, 8);

    return NextResponse.json(
      {
        destino: {
          enderecoInformado: enderecoDestino,
          enderecoFormatado: destinoAtual.enderecoFormatado,
          latitude: destinoAtual.latitude,
          longitude: destinoAtual.longitude,
        },
        periodoDias,
        raioKm,

        /*
         * Mantém o contrato já usado pela tela.
         * Agora "analisados" representa clientes cujo histórico tinha pelo menos
         * um destino já localizado no cache persistente.
         */
        analisados: clientesComHistoricoLocalizado,
        oportunidades,

        diagnosticoCache: {
          clientesHistoricos: agrupadas.size,
          clientesComHistoricoLocalizado,
          enderecosHistoricosUnicos: enderecosHistoricosNormalizados.length,
          enderecosHistoricosNoCache: coordenadasSalvas.length,
          geocodificacoesHistoricasNestaBusca: 0,
          destinoVeioDoCache: destinoAtual.cache,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao buscar oportunidades de encaixe:", error);

    return erro(
      error instanceof Error
        ? error.message
        : "Não foi possível buscar oportunidades de encaixe.",
      500
    );
  }
}
