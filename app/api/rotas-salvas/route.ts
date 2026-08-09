import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarTexto(valor: unknown) {
  return texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizarParadas(valor: unknown) {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((parada, ordem) => ({
      ordem,
      tipo: texto(parada?.tipo) || "Entrega",
      cliente: texto(parada?.cliente),
      endereco: texto(parada?.endereco),
      contato: texto(parada?.contato) || null,
      observacao: texto(parada?.observacao) || null,
    }))
    .filter((parada) => parada.endereco);
}

function assinaturaDasParadas(
  paradas: Array<{
    tipo?: unknown;
    cliente?: unknown;
    endereco?: unknown;
  }>
) {
  return JSON.stringify(
    paradas.map((parada) => ({
      tipo: normalizarTexto(parada.tipo),
      cliente: normalizarTexto(parada.cliente),
      endereco: normalizarTexto(parada.endereco),
    }))
  );
}

function idHistorico(assinatura: string) {
  return `historico-${createHash("sha1").update(assinatura).digest("hex").slice(0, 16)}`;
}

function nomePelasParadas(
  paradas: Array<{
    cliente?: string | null;
    endereco?: string | null;
  }>
) {
  const nomes = paradas
    .map((parada) => texto(parada.cliente) || texto(parada.endereco))
    .filter(Boolean);

  if (nomes.length === 0) return "Rota automática";
  if (nomes.length === 1) return nomes[0];

  return `${nomes[0]} → ${nomes[nomes.length - 1]}`;
}

async function nomeDisponivel(solicitante: string, nomeBase: string) {
  const base = nomeBase || "Rota automática";
  let nome = base;
  let numero = 2;

  while (
    await prisma.rotaSalva.findUnique({
      where: {
        solicitante_nome: {
          solicitante,
          nome,
        },
      },
      select: { id: true },
    })
  ) {
    nome = `${base} (${numero})`;
    numero += 1;
  }

  return nome;
}

async function atualizarLocais(
  solicitante: string,
  paradas: Array<{
    cliente: string;
    endereco: string;
    contato: string | null;
    observacao: string | null;
  }>
) {
  for (const parada of paradas) {
    if (!parada.cliente) continue;

    await prisma.localSolicitante.upsert({
      where: {
        solicitante_cliente: {
          solicitante,
          cliente: parada.cliente,
        },
      },
      update: {
        endereco: parada.endereco,
        contato: parada.contato,
        observacaoFixa: parada.observacao,
      },
      create: {
        solicitante,
        cliente: parada.cliente,
        endereco: parada.endereco,
        contato: parada.contato,
        observacaoFixa: parada.observacao,
      },
    });
  }
}


async function removerLocaisSemRota(
  solicitante: string,
  clientesCandidatos: string[]
) {
  const candidatosNormalizados = Array.from(
    new Set(clientesCandidatos.map((cliente) => texto(cliente)).filter(Boolean))
  );

  if (candidatosNormalizados.length === 0) {
    return;
  }

  const rotasAtuais = await prisma.rotaSalva.findMany({
    where: { solicitante },
    select: {
      paradas: {
        select: {
          cliente: true,
        },
      },
    },
  });

  const clientesAindaUtilizados = new Set(
    rotasAtuais
      .flatMap((rota) => rota.paradas)
      .map((parada) => normalizarTexto(parada.cliente))
      .filter(Boolean)
  );

  const clientesParaExcluir = candidatosNormalizados.filter(
    (cliente) => !clientesAindaUtilizados.has(normalizarTexto(cliente))
  );

  if (clientesParaExcluir.length === 0) {
    return;
  }

  await prisma.localSolicitante.deleteMany({
    where: {
      solicitante,
      cliente: {
        in: clientesParaExcluir,
      },
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const solicitante = texto(searchParams.get("solicitante"));
    const incluirHistorico = searchParams.get("incluirHistorico") === "1";

    if (!solicitante) {
      return NextResponse.json([]);
    }

    const rotasSalvas = await prisma.rotaSalva.findMany({
      where: { solicitante },
      include: {
        paradas: {
          orderBy: { ordem: "asc" },
        },
      },
      orderBy: { nome: "asc" },
    });

    const salvasFormatadas = rotasSalvas.map((rota) => ({
      ...rota,
      origem: "salva" as const,
      assinaturaHistorica: null,
      quantidadeUsos: null,
      ultimaUtilizacao: null,
    }));

    if (!incluirHistorico) {
      return NextResponse.json(salvasFormatadas);
    }

    const [teles, ignoradas] = await Promise.all([
      prisma.tele.findMany({
        where: {
          solicitante,
          orcamento: false,
          paradas: {
            some: {},
          },
        },
        select: {
          id: true,
          dataTele: true,
          paradas: {
            orderBy: { ordem: "asc" },
            select: {
              tipo: true,
              cliente: true,
              endereco: true,
              contato: true,
              observacao: true,
              ordem: true,
            },
          },
        },
        orderBy: { dataTele: "desc" },
        take: 500,
      }),
      prisma.rotaHistoricaIgnorada.findMany({
        where: { solicitante },
        select: { assinatura: true },
      }),
    ]);

    const assinaturasSalvas = new Set(
      rotasSalvas.map(
        (rota) => rota.assinatura || assinaturaDasParadas(rota.paradas)
      )
    );
    const assinaturasIgnoradas = new Set(ignoradas.map((item) => item.assinatura));

    const grupos = new Map<
      string,
      {
        assinatura: string;
        quantidadeUsos: number;
        ultimaUtilizacao: Date;
        paradas: Array<{
          ordem: number;
          tipo: string;
          cliente: string;
          endereco: string;
          contato: string | null;
          observacao: string | null;
        }>;
      }
    >();

    for (const tele of teles) {
      const paradas = tele.paradas.map((parada, ordem) => ({
        ordem,
        tipo: String(parada.tipo || "ENTREGA")
          .toLowerCase()
          .replaceAll("_", " ")
          .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase())
          .replace("E Coleta", "e coleta"),
        cliente: parada.cliente || "",
        endereco: parada.endereco || "",
        contato: parada.contato || null,
        observacao: parada.observacao || null,
      }));

      const assinatura = assinaturaDasParadas(paradas);

      if (
        !assinatura ||
        assinatura === "[]" ||
        assinaturasSalvas.has(assinatura) ||
        assinaturasIgnoradas.has(assinatura)
      ) {
        continue;
      }

      const grupo = grupos.get(assinatura);

      if (grupo) {
        grupo.quantidadeUsos += 1;

        if (tele.dataTele > grupo.ultimaUtilizacao) {
          grupo.ultimaUtilizacao = tele.dataTele;
          grupo.paradas = paradas;
        }
      } else {
        grupos.set(assinatura, {
          assinatura,
          quantidadeUsos: 1,
          ultimaUtilizacao: tele.dataTele,
          paradas,
        });
      }
    }

    const historicas = Array.from(grupos.values())
      .sort((a, b) => {
        if (b.quantidadeUsos !== a.quantidadeUsos) {
          return b.quantidadeUsos - a.quantidadeUsos;
        }

        return b.ultimaUtilizacao.getTime() - a.ultimaUtilizacao.getTime();
      })
      .slice(0, 50)
      .map((grupo) => ({
        id: idHistorico(grupo.assinatura),
        solicitante,
        nome: nomePelasParadas(grupo.paradas),
        paradas: grupo.paradas.map((parada, ordem) => ({
          id: `${idHistorico(grupo.assinatura)}-${ordem}`,
          rotaId: idHistorico(grupo.assinatura),
          ...parada,
          createdAt: grupo.ultimaUtilizacao.toISOString(),
          updatedAt: grupo.ultimaUtilizacao.toISOString(),
        })),
        origem: "historico" as const,
        assinaturaHistorica: grupo.assinatura,
        quantidadeUsos: grupo.quantidadeUsos,
        ultimaUtilizacao: grupo.ultimaUtilizacao.toISOString(),
        createdAt: grupo.ultimaUtilizacao.toISOString(),
        updatedAt: grupo.ultimaUtilizacao.toISOString(),
      }));

    return NextResponse.json([...salvasFormatadas, ...historicas]);
  } catch (error) {
    console.error("Erro ao carregar rotas salvas:", error);
    return NextResponse.json(
      { erro: "Não foi possível carregar as rotas salvas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = texto(body.id);
    const solicitante = texto(body.solicitante);
    const nomeRecebido = texto(body.nome);
    const automatico = body.automatico === true;
    const assinaturaHistorica = texto(body.assinaturaHistorica);
    const paradas = normalizarParadas(body.paradas);
    const assinatura = assinaturaHistorica || assinaturaDasParadas(paradas);

    if (!solicitante || paradas.length === 0) {
      return NextResponse.json(
        { erro: "Solicitante e ao menos uma parada são obrigatórios." },
        { status: 400 }
      );
    }

    if (!assinatura || assinatura === "[]") {
      return NextResponse.json(
        { erro: "Não foi possível identificar a rota." },
        { status: 400 }
      );
    }

    if (automatico) {
      const ignorada = await prisma.rotaHistoricaIgnorada.findUnique({
        where: {
          solicitante_assinatura: {
            solicitante,
            assinatura,
          },
        },
      });

      if (ignorada?.motivo === "EXCLUIDA") {
        return NextResponse.json({
          sucesso: true,
          ignorada: true,
          motivo: "A rota foi excluída pelo gestor e não será recriada automaticamente.",
        });
      }
    }

    const rotaMesmaAssinatura = await prisma.rotaSalva.findFirst({
      where: {
        solicitante,
        assinatura,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const rotaIdParaAtualizar =
      id && !id.startsWith("historico-")
        ? id
        : rotaMesmaAssinatura?.id || null;

    const rotaAnterior = rotaIdParaAtualizar
      ? await prisma.rotaSalva.findUnique({
          where: { id: rotaIdParaAtualizar },
          select: {
            paradas: {
              select: {
                cliente: true,
              },
            },
          },
        })
      : null;

    const rota = await prisma.$transaction(async (tx) => {
      if (rotaIdParaAtualizar) {
        const existente = await tx.rotaSalva.findUnique({
          where: { id: rotaIdParaAtualizar },
        });

        if (!existente) {
          throw new Error("Rota não encontrada.");
        }

        await tx.rotaSalvaParada.deleteMany({
          where: { rotaId: rotaIdParaAtualizar },
        });

        return tx.rotaSalva.update({
          where: { id: rotaIdParaAtualizar },
          data: {
            nome: automatico
              ? existente.nome
              : nomeRecebido || existente.nome,
            solicitante,
            assinatura,
            paradas: { create: paradas },
          },
          include: { paradas: { orderBy: { ordem: "asc" } } },
        });
      }

      const nomeBase = nomeRecebido || nomePelasParadas(paradas);
      const nome = await nomeDisponivel(solicitante, nomeBase);

      return tx.rotaSalva.create({
        data: {
          nome,
          solicitante,
          assinatura,
          paradas: { create: paradas },
        },
        include: { paradas: { orderBy: { ordem: "asc" } } },
      });
    });

    if (assinaturaHistorica) {
      await prisma.rotaHistoricaIgnorada.upsert({
        where: {
          solicitante_assinatura: {
            solicitante,
            assinatura: assinaturaHistorica,
          },
        },
        update: { motivo: "CONVERTIDA" },
        create: {
          solicitante,
          assinatura: assinaturaHistorica,
          motivo: "CONVERTIDA",
        },
      });
    }

    await atualizarLocais(solicitante, paradas);

    await removerLocaisSemRota(
      solicitante,
      rotaAnterior?.paradas.map((parada) => parada.cliente || "") || []
    );

    return NextResponse.json({
      ...rota,
      origem: "salva",
      assinaturaHistorica: null,
      atualizadaAutomaticamente: automatico,
    });
  } catch (error) {
    console.error("Erro ao salvar rota:", error);
    const mensagem =
      error instanceof Error ? error.message : "Não foi possível salvar a rota.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = texto(searchParams.get("id"));
    const solicitante = texto(searchParams.get("solicitante"));
    const assinaturaHistorica = texto(searchParams.get("assinaturaHistorica"));

    if (assinaturaHistorica) {
      if (!solicitante) {
        return NextResponse.json(
          { erro: "Solicitante não informado." },
          { status: 400 }
        );
      }

      await prisma.rotaHistoricaIgnorada.upsert({
        where: {
          solicitante_assinatura: {
            solicitante,
            assinatura: assinaturaHistorica,
          },
        },
        update: { motivo: "EXCLUIDA" },
        create: {
          solicitante,
          assinatura: assinaturaHistorica,
          motivo: "EXCLUIDA",
        },
      });

      return NextResponse.json({ sucesso: true });
    }

    if (!id) {
      return NextResponse.json(
        { erro: "Rota não informada." },
        { status: 400 }
      );
    }

    const rota = await prisma.rotaSalva.findUnique({
      where: { id },
      include: { paradas: { orderBy: { ordem: "asc" } } },
    });

    if (!rota) {
      return NextResponse.json(
        { erro: "Rota não encontrada." },
        { status: 404 }
      );
    }

    const assinatura =
      rota.assinatura || assinaturaDasParadas(rota.paradas);

    await prisma.$transaction([
      prisma.rotaHistoricaIgnorada.upsert({
        where: {
          solicitante_assinatura: {
            solicitante: rota.solicitante,
            assinatura,
          },
        },
        update: { motivo: "EXCLUIDA" },
        create: {
          solicitante: rota.solicitante,
          assinatura,
          motivo: "EXCLUIDA",
        },
      }),
      prisma.rotaSalva.delete({ where: { id } }),
    ]);

    await removerLocaisSemRota(
      rota.solicitante,
      rota.paradas.map((parada) => parada.cliente || "")
    );

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    return NextResponse.json(
      { erro: "Não foi possível excluir a rota." },
      { status: 500 }
    );
  }
}