import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PONTOS_PADRAO: Record<string, number> = {
  RECUSA_TELE: -8,
  EXPIRACAO_ACEITE: -8,
  CORRECAO_ETAPA: -2,
  ATRASO_ONLINE: -5,
  OFFLINE_EXPEDIENTE: -5,
  DEMORA_INICIO: -4,
  ATRASO_MOTOBOY: -5,
  INDISPONIBILIDADE: -5,
  ABANDONO_TELE: -15,
  RECLAMACAO_CLIENTE: -10,
};

const TITULOS: Record<string, string> = {
  RECUSA_TELE: "Recusa de tele",
  EXPIRACAO_ACEITE: "Prazo de aceite expirado",
  CORRECAO_ETAPA: "Correção de etapa",
  ATRASO_ONLINE: "Atraso para ficar online",
  OFFLINE_EXPEDIENTE: "Offline durante o expediente",
  DEMORA_INICIO: "Demora após aceitar",
  ATRASO_MOTOBOY: "Atraso causado pelo motoboy",
  INDISPONIBILIDADE: "Indisponibilidade / sem resposta",
  ABANDONO_TELE: "Abandono de tele",
  RECLAMACAO_CLIENTE: "Reclamação de cliente",
  AJUSTE: "Ajuste manual",
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function exigirAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;
  if (!userId) return null;

  return prisma.user.findFirst({
    where: { id: userId, role: "ADMIN" },
    select: { id: true },
  });
}

function dataBrasilISO(data = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function intervaloSemana(dataISO: string) {
  const segura = /^\d{4}-\d{2}-\d{2}$/.test(dataISO) ? dataISO : dataBrasilISO();
  const base = new Date(`${segura}T12:00:00-03:00`);
  const dia = base.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;

  const inicio = new Date(base);
  inicio.setDate(base.getDate() + deslocamento);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);

  const inicioISO = dataBrasilISO(inicio);
  const fimISO = dataBrasilISO(fim);

  return {
    inicioISO,
    fimISO,
    inicio: new Date(`${inicioISO}T00:00:00-03:00`),
    fim: new Date(`${fimISO}T23:59:59.999-03:00`),
  };
}

function limitarNota(valor: number) {
  return Math.max(0, Math.min(100, valor));
}

export async function GET(request: Request) {
  try {
    const admin = await exigirAdmin();
    if (!admin) return respostaErro("Acesso permitido somente ao gestor.", 403);

    const url = new URL(request.url);
    const referencia = url.searchParams.get("data") || dataBrasilISO();
    const { inicioISO, fimISO, inicio, fim } = intervaloSemana(referencia);

    const [motoboys, ocorrencias] = await Promise.all([
      prisma.motoboy.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, moto: true, placa: true },
      }),
      prisma.motoboyPontuacao.findMany({
        where: { ocorridoEm: { gte: inicio, lte: fim } },
        include: {
          motoboy: { select: { id: true, nome: true } },
        },
        orderBy: [{ ocorridoEm: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const resumo = motoboys.map((motoboy) => {
      const itens = ocorrencias.filter(
        (item) => item.motoboyId === motoboy.id && item.status !== "ANULADA"
      );
      const saldoPontos = itens.reduce((soma, item) => soma + Number(item.pontos || 0), 0);

      return {
        ...motoboy,
        nota: limitarNota(100 + saldoPontos),
        saldoPontos,
        ocorrencias: itens.length,
        anuladas: ocorrencias.filter(
          (item) => item.motoboyId === motoboy.id && item.status === "ANULADA"
        ).length,
      };
    });

    return NextResponse.json({
      periodo: { inicio: inicioISO, fim: fimISO },
      resumo,
      ocorrencias,
      tipos: Object.entries(TITULOS).map(([tipo, titulo]) => ({
        tipo,
        titulo,
        pontosPadrao: tipo === "AJUSTE" ? 0 : PONTOS_PADRAO[tipo],
        automatico: ["RECUSA_TELE", "EXPIRACAO_ACEITE", "CORRECAO_ETAPA", "ATRASO_ONLINE", "OFFLINE_EXPEDIENTE", "DEMORA_INICIO"].includes(tipo),
      })),
      regrasAutomaticas: {
        atrasoOnline: {
          diasUteis: "Seg-Sex 08:30; Sáb 09:00",
          toleranciaMinutos: 15,
          pontos: -5,
        },
        offlineExpediente: {
          diasUteis: "Seg-Sex 08:30-12:00 e 13:30-19:00; Sáb 09:00-16:00",
          pontos: -5,
        },
        demoraInicio: {
          limiteMinutos: 10,
          pontos: -4,
          observacao: "Aplicado somente quando a tele entrou como primeira da fila.",
        },
      },
    });
  } catch (erro) {
    console.error("Erro ao carregar pontuação dos motoboys:", erro);
    return respostaErro("Não foi possível carregar a pontuação.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await exigirAdmin();
    if (!admin) return respostaErro("Acesso permitido somente ao gestor.", 403);

    const body = await request.json();
    const motoboyId = String(body?.motoboyId || "").trim();
    const teleId = String(body?.teleId || "").trim() || null;
    const tipo = String(body?.tipo || "").trim().toUpperCase();
    const descricao = String(body?.descricao || "").trim();

    if (!motoboyId) return respostaErro("Selecione o motoboy.", 400);
    if (!TITULOS[tipo]) return respostaErro("Tipo de ocorrência inválido.", 400);
    if (!descricao) return respostaErro("Informe a justificativa da ocorrência.", 400);

    const motoboy = await prisma.motoboy.findUnique({
      where: { id: motoboyId },
      select: { id: true },
    });
    if (!motoboy) return respostaErro("Motoboy não encontrado.", 404);

    let pontos = tipo === "AJUSTE" ? Number(body?.pontos || 0) : PONTOS_PADRAO[tipo];

    if (tipo === "ATRASO_MOTOBOY") {
      const informado = Number(body?.pontos);
      if (informado === -10 || informado === -5) pontos = informado;
    }

    if (!Number.isFinite(pontos) || pontos < -100 || pontos > 100 || pontos === 0) {
      return respostaErro("Informe uma pontuação válida.", 400);
    }

    const ocorridoEm = body?.ocorridoEm ? new Date(String(body.ocorridoEm)) : new Date();
    if (Number.isNaN(ocorridoEm.getTime())) return respostaErro("Data inválida.", 400);

    const ocorrencia = await prisma.motoboyPontuacao.create({
      data: {
        motoboyId,
        teleId,
        tipo,
        titulo: TITULOS[tipo],
        descricao,
        descricaoOriginal: descricao,
        pontos: Math.trunc(pontos),
        pontosOriginais: Math.trunc(pontos),
        origem: "MANUAL",
        status: "ATIVA",
        ocorridoEm,
        criadoPor: admin.id,
      },
      include: { motoboy: { select: { id: true, nome: true } } },
    });

    return NextResponse.json(ocorrencia);
  } catch (erro) {
    console.error("Erro ao registrar ocorrência:", erro);
    return respostaErro("Não foi possível registrar a ocorrência.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await exigirAdmin();
    if (!admin) return respostaErro("Acesso permitido somente ao gestor.", 403);

    const body = await request.json();
    const id = String(body?.id || "").trim();
    const descricao = String(body?.descricao || "").trim();
    const pontos = Number(body?.pontos);

    if (!id) return respostaErro("Ocorrência não informada.", 400);
    if (!descricao) return respostaErro("Informe a justificativa.", 400);
    if (!Number.isFinite(pontos) || pontos < -100 || pontos > 100 || pontos === 0) {
      return respostaErro("Pontuação inválida.", 400);
    }

    const atual = await prisma.motoboyPontuacao.findUnique({ where: { id } });
    if (!atual) return respostaErro("Ocorrência não encontrada.", 404);
    if (atual.status === "ANULADA") {
      return respostaErro("Ocorrência anulada não pode ser editada.", 409);
    }

    const editada = await prisma.motoboyPontuacao.update({
      where: { id },
      data: {
        descricao,
        pontos: Math.trunc(pontos),
        descricaoOriginal: atual.descricaoOriginal || atual.descricao,
        pontosOriginais: atual.pontosOriginais ?? atual.pontos,
        status: "EDITADA",
        editadoEm: new Date(),
        editadoPor: admin.id,
      },
      include: { motoboy: { select: { id: true, nome: true } } },
    });

    return NextResponse.json(editada);
  } catch (erro) {
    console.error("Erro ao editar ocorrência:", erro);
    return respostaErro("Não foi possível editar a ocorrência.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await exigirAdmin();
    if (!admin) return respostaErro("Acesso permitido somente ao gestor.", 403);

    const body = await request.json();
    const id = String(body?.id || "").trim();
    const motivo = String(body?.motivo || "").trim();

    if (!id) return respostaErro("Ocorrência não informada.", 400);
    if (!motivo) return respostaErro("Informe o motivo da anulação.", 400);

    const atual = await prisma.motoboyPontuacao.findUnique({ where: { id } });
    if (!atual) return respostaErro("Ocorrência não encontrada.", 404);

    const anulada = await prisma.motoboyPontuacao.update({
      where: { id },
      data: {
        status: "ANULADA",
        anuladoEm: new Date(),
        anuladoPor: admin.id,
        motivoAnulacao: motivo,
        descricaoOriginal: atual.descricaoOriginal || atual.descricao,
        pontosOriginais: atual.pontosOriginais ?? atual.pontos,
      },
    });

    return NextResponse.json({ ok: true, ocorrencia: anulada });
  } catch (erro) {
    console.error("Erro ao anular ocorrência:", erro);
    return respostaErro("Não foi possível anular a ocorrência.", 500);
  }
}
