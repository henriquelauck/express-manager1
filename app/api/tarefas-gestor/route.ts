import { prisma } from "@/lib/prisma";
import type { TipoTarefaGestor } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const FUSO_BRASIL = "America/Sao_Paulo";
const HORA_GERACAO_AUTOMATICA = 19;

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function normalizar(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function partesBrasil(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(data);

  const obter = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  const diaTexto = obter("weekday");
  const diaSemana =
    diaTexto === "Sun"
      ? 0
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(diaTexto) + 1;

  return {
    ano: Number(obter("year")),
    mes: Number(obter("month")),
    dia: Number(obter("day")),
    hora: Number(obter("hour")),
    minuto: Number(obter("minute")),
    diaSemana,
  };
}

function dataTextoBrasil(data = new Date()) {
  const { ano, mes, dia } = partesBrasil(data);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function meioDiaBrasil(data = new Date()) {
  return new Date(`${dataTextoBrasil(data)}T12:00:00-03:00`);
}

function intervaloDiaBrasil(data = new Date()) {
  const texto = dataTextoBrasil(data);
  return {
    inicio: new Date(`${texto}T00:00:00-03:00`),
    fim: new Date(`${texto}T23:59:59.999-03:00`),
  };
}

function intervaloSemanaBrasil(data = new Date()) {
  const referencia = meioDiaBrasil(data);
  const { diaSemana } = partesBrasil(data);
  const inicio = new Date(referencia);
  inicio.setUTCDate(inicio.getUTCDate() - diaSemana);
  inicio.setUTCHours(3, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  fim.setUTCHours(26, 59, 59, 999);

  return { inicio, fim };
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

async function admin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;
  if (!userId) return null;

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  return usuario?.role === "ADMIN" ? usuario : null;
}

async function salvarAutomatica({
  tipo,
  dataReferencia,
  titulo,
  descricao,
  valor,
  quantidadeTeles,
  teleIds,
}: {
  tipo: TipoTarefaGestor;
  dataReferencia: Date;
  titulo: string;
  descricao: string;
  valor: number;
  quantidadeTeles: number;
  teleIds: string[];
}) {
  const existente = await prisma.tarefaGestor.findUnique({
    where: { tipo_dataReferencia: { tipo, dataReferencia } },
  });

  if (existente?.concluida) return existente;

  if (existente) {
    return prisma.tarefaGestor.update({
      where: { id: existente.id },
      data: { titulo, descricao, valor, quantidadeTeles, teleIds },
    });
  }

  return prisma.tarefaGestor.create({
    data: { tipo, dataReferencia, titulo, descricao, valor, quantidadeTeles, teleIds },
  });
}

async function gerarAutomaticasAntigas() {
  const agora = new Date();
  const { hora, diaSemana } = partesBrasil(agora);
  if (hora < HORA_GERACAO_AUTOMATICA) return;

  const dataReferencia = meioDiaBrasil(agora);
  const { inicio, fim } = intervaloDiaBrasil(agora);

  const telesDoDia = await prisma.tele.findMany({
    where: { dataTele: { gte: inicio, lte: fim } },
    select: { id: true, solicitante: true, total: true, valorRecebido: true },
  });

  const saveCell = telesDoDia
    .filter((tele) => normalizar(tele.solicitante).includes("savecell"))
    .map((tele) => ({
      ...tele,
      saldo: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
    }))
    .filter((tele) => tele.saldo > 0.009);

  if (saveCell.length > 0) {
    const valor = saveCell.reduce((soma, tele) => soma + tele.saldo, 0);
    await salvarAutomatica({
      tipo: "SAVECELL_PENDENCIAS",
      dataReferencia,
      titulo: "Descontar pendências da SaveCell",
      descricao: `Descontar ${formatarMoeda(valor)} da conta com a SaveCell.`,
      valor,
      quantidadeTeles: saveCell.length,
      teleIds: saveCell.map((tele) => tele.id),
    });
  }

  const { inicio: inicioSemana, fim: fimSemana } = intervaloSemanaBrasil(agora);

  if (diaSemana === 5 && hora >= 15) {
    const especiais = ["ohabotanica", "addcliches", "hardware"];
    const teles = await prisma.tele.findMany({
      where: { dataTele: { gte: inicioSemana, lte: fimSemana }, fechamentoId: null },
      select: { id: true, solicitante: true, total: true, valorRecebido: true },
    });

    const pendencias = teles
      .map((tele) => ({
        ...tele,
        nome: normalizar(tele.solicitante),
        saldo: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
      }))
      .filter(
        (tele) =>
          especiais.some((cliente) => tele.nome.includes(cliente)) &&
          tele.saldo > 0.009
      );

    if (pendencias.length > 0) {
      const valor = pendencias.reduce((soma, tele) => soma + tele.saldo, 0);
      const clientes = Array.from(new Set(pendencias.map((tele) => tele.solicitante)));

      await salvarAutomatica({
        tipo: "FECHAMENTO_SEXTA_ESPECIAIS",
        dataReferencia,
        titulo: "Enviar fechamentos de sexta-feira",
        descricao: `Enviar o fechamento de ${clientes.join(", ")}. Total pendente: ${formatarMoeda(valor)}.`,
        valor,
        quantidadeTeles: pendencias.length,
        teleIds: pendencias.map((tele) => tele.id),
      });
    }
  }

  if (diaSemana === 6 && hora >= 16) {
    const excluidos = ["ohabotanica", "addcliches", "hardware"];
    const teles = await prisma.tele.findMany({
      where: { dataTele: { gte: inicioSemana, lte: fimSemana }, fechamentoId: null },
      select: { id: true, solicitante: true, total: true, valorRecebido: true },
    });

    const pendencias = teles
      .map((tele) => ({
        ...tele,
        nome: normalizar(tele.solicitante),
        saldo: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
      }))
      .filter(
        (tele) =>
          !excluidos.some((cliente) => tele.nome.includes(cliente)) &&
          tele.saldo > 0.009
      );

    if (pendencias.length > 0) {
      const valor = pendencias.reduce((soma, tele) => soma + tele.saldo, 0);
      const clientes = Array.from(new Set(pendencias.map((tele) => tele.solicitante)));

      await salvarAutomatica({
        tipo: "FECHAMENTO_SABADO_DEMAIS",
        dataReferencia,
        titulo: "Enviar fechamentos dos demais clientes",
        descricao: `Enviar o fechamento de ${clientes.length} ${
          clientes.length === 1 ? "cliente" : "clientes"
        } em aberto. Total pendente: ${formatarMoeda(valor)}.`,
        valor,
        quantidadeTeles: pendencias.length,
        teleIds: pendencias.map((tele) => tele.id),
      });
    }
  }
}

async function garantirRegraMarcos() {
  const existente = await prisma.regraTarefaGestor.findFirst({
    where: {
      tipoCondicao: "TELE_NAO_PAGA_SOLICITANTE",
      solicitanteFiltro: "Marcos Moto Peças",
    },
  });

  if (existente) return existente;

  return prisma.regraTarefaGestor.create({
    data: {
      titulo: "Acertar pendência com Marcos Moto Peças",
      descricao: "Conferir e acertar as entregas ainda não pagas do Marcos Moto Peças.",
      hora: 19,
      minuto: 0,
      diasSemana: [1, 2, 3, 4, 5, 6],
      recorrente: true,
      ativa: true,
      tipoCondicao: "TELE_NAO_PAGA_SOLICITANTE",
      solicitanteFiltro: "Marcos Moto Peças",
    },
  });
}


async function garantirRegraCobrancasNaHora() {
  const existente = await prisma.regraTarefaGestor.findFirst({
    where: {
      tipoCondicao: "COBRANCA_NA_HORA_DIA",
    },
  });

  if (existente) return existente;

  return prisma.regraTarefaGestor.create({
    data: {
      titulo: "Cobranças na hora pendentes do dia",
      descricao: "Conferir as teles de cobrança na hora que ainda não foram pagas.",
      hora: 19,
      minuto: 0,
      diasSemana: [1, 2, 3, 4, 5, 6],
      recorrente: true,
      ativa: true,
      tipoCondicao: "COBRANCA_NA_HORA_DIA",
      solicitanteFiltro: null,
    },
  });
}

async function dadosCondicao(regra: {
  tipoCondicao: string;
  solicitanteFiltro: string | null;
}) {
  if (regra.tipoCondicao === "NENHUMA") {
    return {
      atende: true,
      valor: 0,
      quantidade: 0,
      teleIds: [] as string[],
      complemento: "",
    };
  }

  if (regra.tipoCondicao === "COBRANCA_NA_HORA_DIA") {
    const { inicio, fim } = intervaloDiaBrasil();

    const candidatas = await prisma.tele.findMany({
      where: {
        dataTele: {
          gte: inicio,
          lte: fim,
        },
        formaCobranca: "NA_HORA",
        orcamento: false,
      },
      select: {
        id: true,
        solicitante: true,
        total: true,
        valorRecebido: true,
      },
      orderBy: {
        dataTele: "asc",
      },
    });

    const pendentes = candidatas
      .map((tele) => ({
        ...tele,
        saldo: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
      }))
      .filter((tele) => tele.saldo > 0.009);

    const valor = pendentes.reduce((soma, tele) => soma + tele.saldo, 0);
    const clientes = Array.from(
      new Set(pendentes.map((tele) => tele.solicitante).filter(Boolean))
    );

    return {
      atende: pendentes.length > 0,
      valor,
      quantidade: pendentes.length,
      teleIds: pendentes.map((tele) => tele.id),
      complemento:
        pendentes.length > 0
          ? `${pendentes.length} ${
              pendentes.length === 1 ? "tele de cobrança na hora" : "teles de cobrança na hora"
            } de ${clientes.length} ${
              clientes.length === 1 ? "cliente" : "clientes"
            } — ${formatarMoeda(valor)} em aberto.`
          : "",
    };
  }

  if (regra.tipoCondicao !== "TELE_NAO_PAGA_SOLICITANTE") {
    return {
      atende: false,
      valor: 0,
      quantidade: 0,
      teleIds: [] as string[],
      complemento: "",
    };
  }

  const filtro = String(regra.solicitanteFiltro || "").trim();
  if (!filtro) {
    return {
      atende: false,
      valor: 0,
      quantidade: 0,
      teleIds: [] as string[],
      complemento: "",
    };
  }

  const palavra = filtro.split(/\s+/)[0] || filtro;
  const candidatas = await prisma.tele.findMany({
    where: {
      solicitante: { contains: palavra, mode: "insensitive" },
      orcamento: false,
    },
    select: {
      id: true,
      solicitante: true,
      total: true,
      valorRecebido: true,
    },
  });

  const alvo = normalizar(filtro);
  const pendentes = candidatas
    .filter((tele) => normalizar(tele.solicitante).includes(alvo))
    .map((tele) => ({
      ...tele,
      saldo: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
    }))
    .filter((tele) => tele.saldo > 0.009);

  const valor = pendentes.reduce((soma, tele) => soma + tele.saldo, 0);

  return {
    atende: pendentes.length > 0,
    valor,
    quantidade: pendentes.length,
    teleIds: pendentes.map((tele) => tele.id),
    complemento:
      pendentes.length > 0
        ? `${pendentes.length} ${
            pendentes.length === 1 ? "tele não paga" : "teles não pagas"
          } — ${formatarMoeda(valor)} em aberto.`
        : "",
  };
}

function horarioJaChegou(hora: number, minuto: number, agora = new Date()) {
  const partes = partesBrasil(agora);
  return partes.hora > hora || (partes.hora === hora && partes.minuto >= minuto);
}

function dataUnicaEhHoje(dataUnica: Date | null, agora = new Date()) {
  if (!dataUnica) return false;
  return dataTextoBrasil(dataUnica) === dataTextoBrasil(agora);
}

async function gerarOcorrenciasAgendadas() {
  await garantirRegraMarcos();
  await garantirRegraCobrancasNaHora();

  const agora = new Date();
  const hoje = dataTextoBrasil(agora);
  const { diaSemana } = partesBrasil(agora);

  const regras = await prisma.regraTarefaGestor.findMany({
    where: { ativa: true },
    orderBy: [{ hora: "asc" }, { minuto: "asc" }],
  });

  for (const regra of regras) {
    const diaPermitido = regra.recorrente
      ? regra.diasSemana.includes(diaSemana)
      : dataUnicaEhHoje(regra.dataUnica, agora);

    if (!diaPermitido || !horarioJaChegou(regra.hora, regra.minuto, agora)) {
      continue;
    }

    const jaVerificadaHoje =
      regra.ultimaVerificacaoEm &&
      dataTextoBrasil(regra.ultimaVerificacaoEm) === hoje;

    if (jaVerificadaHoje) {
      continue;
    }

    const condicao = await dadosCondicao(regra);

    await prisma.regraTarefaGestor.update({
      where: { id: regra.id },
      data: {
        ultimaVerificacaoEm: agora,
        ...(!regra.recorrente ? { ativa: false } : {}),
      },
    });

    // Sem pendência no horário: ocorrência descartada pelo restante do dia.
    if (!condicao.atende) {
      continue;
    }

    const chave = `${regra.id}:${hoje}`;

    const jaGeradaHoje = await prisma.tarefaGestor.findUnique({
      where: { chaveOcorrencia: chave },
    });

    if (jaGeradaHoje) {
      continue;
    }

    const pendenteAnterior = await prisma.tarefaGestor.findFirst({
      where: {
        regraId: regra.id,
        concluida: false,
      },
      orderBy: { createdAt: "asc" },
    });

    const descricao = [regra.descricao, condicao.complemento]
      .filter(Boolean)
      .join(" ");

    if (pendenteAnterior) {
      await prisma.tarefaGestor.update({
        where: { id: pendenteAnterior.id },
        data: {
          descricao,
          valor: condicao.valor,
          quantidadeTeles: condicao.quantidade,
          teleIds: condicao.teleIds,
        },
      });

      continue;
    }

    await prisma.tarefaGestor.create({
      data: {
        tipo: "MANUAL",
        regraId: regra.id,
        chaveOcorrencia: chave,
        dataReferencia: meioDiaBrasil(agora),
        titulo: regra.titulo,
        descricao,
        valor: condicao.valor,
        quantidadeTeles: condicao.quantidade,
        teleIds: condicao.teleIds,
      },
    });
  }
}

export async function GET(request: Request) {
  try {
    if (!(await admin())) return erro("Acesso negado.", 403);

    await gerarAutomaticasAntigas();
    await gerarOcorrenciasAgendadas();

    const url = new URL(request.url);
    const filtro = url.searchParams.get("filtro") || "pendentes";
    const modo = url.searchParams.get("modo") || "dashboard";

    const where =
      filtro === "concluidas"
        ? { concluida: true }
        : filtro === "todas"
          ? {}
          : { concluida: false };

    const tarefas = await prisma.tarefaGestor.findMany({
      where,
      orderBy: [
        { concluida: "asc" },
        { dataReferencia: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (modo !== "central") {
      return NextResponse.json(tarefas);
    }

    const regras = await prisma.regraTarefaGestor.findMany({
      orderBy: [{ ativa: "desc" }, { hora: "asc" }, { minuto: "asc" }],
    });

    return NextResponse.json({ tarefas, regras });
  } catch (error) {
    console.error("Erro ao carregar tarefas do gestor:", error);
    return erro("Não foi possível carregar as tarefas do gestor.", 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await admin())) return erro("Acesso negado.", 403);

    const body = await request.json();
    const titulo = String(body?.titulo || "").trim();
    const descricao = String(body?.descricao || "").trim();
    const hora = Number(body?.hora);
    const minuto = Number(body?.minuto || 0);
    const recorrente = Boolean(body?.recorrente);
    const diasSemana = Array.isArray(body?.diasSemana)
      ? body.diasSemana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
      : [];
    const dataUnicaTexto = String(body?.dataUnica || "").trim();
    const tipoCondicao = String(body?.tipoCondicao || "NENHUMA").trim();
    const solicitanteFiltro = String(body?.solicitanteFiltro || "").trim();

    if (!titulo) return erro("Informe o título da tarefa.", 400);
    if (
      !["NENHUMA", "TELE_NAO_PAGA_SOLICITANTE", "COBRANCA_NA_HORA_DIA"].includes(
        tipoCondicao
      )
    ) {
      return erro("A condição informada é inválida.", 400);
    }
    if (tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE" && !solicitanteFiltro) {
      return erro("Informe o cliente da condição.", 400);
    }
    if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
      return erro("Informe um horário válido.", 400);
    }
    if (!Number.isInteger(minuto) || minuto < 0 || minuto > 59) {
      return erro("Informe minutos válidos.", 400);
    }
    if (recorrente && diasSemana.length === 0) {
      return erro("Selecione pelo menos um dia da semana.", 400);
    }
    if (!recorrente && !/^\d{4}-\d{2}-\d{2}$/.test(dataUnicaTexto)) {
      return erro("Informe a data da tarefa única.", 400);
    }

    const dataUnica = recorrente
      ? null
      : new Date(`${dataUnicaTexto}T12:00:00-03:00`);

    const regra = await prisma.regraTarefaGestor.create({
      data: {
        titulo,
        descricao,
        hora,
        minuto,
        diasSemana: recorrente ? diasSemana : [],
        recorrente,
        dataUnica,
        ativa: true,
        tipoCondicao,
        solicitanteFiltro:
          tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE"
            ? solicitanteFiltro
            : null,
        ultimaVerificacaoEm: null,
      },
    });

    await gerarOcorrenciasAgendadas();

    return NextResponse.json({ ok: true, regra }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    return erro("Não foi possível criar o agendamento.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await admin())) return erro("Acesso negado.", 403);

    const body = await request.json();
    const regraId = String(body?.regraId || "").trim();
    const titulo = String(body?.titulo || "").trim();
    const descricao = String(body?.descricao || "").trim();
    const hora = Number(body?.hora);
    const minuto = Number(body?.minuto || 0);
    const recorrente = Boolean(body?.recorrente);
    const diasSemana = Array.isArray(body?.diasSemana)
      ? body.diasSemana.map(Number).filter((dia: number) => dia >= 0 && dia <= 6)
      : [];
    const dataUnicaTexto = String(body?.dataUnica || "").trim();
    const tipoCondicao = String(body?.tipoCondicao || "NENHUMA").trim();
    const solicitanteFiltro = String(body?.solicitanteFiltro || "").trim();

    if (!regraId || !titulo) return erro("Dados do agendamento incompletos.", 400);
    if (
      !["NENHUMA", "TELE_NAO_PAGA_SOLICITANTE", "COBRANCA_NA_HORA_DIA"].includes(
        tipoCondicao
      )
    ) {
      return erro("A condição informada é inválida.", 400);
    }
    if (tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE" && !solicitanteFiltro) {
      return erro("Informe o cliente da condição.", 400);
    }
    if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
      return erro("Informe um horário válido.", 400);
    }
    if (recorrente && diasSemana.length === 0) {
      return erro("Selecione pelo menos um dia da semana.", 400);
    }

    const dataUnica = recorrente
      ? null
      : new Date(`${dataUnicaTexto}T12:00:00-03:00`);

    const regra = await prisma.regraTarefaGestor.update({
      where: { id: regraId },
      data: {
        titulo,
        descricao,
        hora,
        minuto,
        diasSemana: recorrente ? diasSemana : [],
        recorrente,
        dataUnica,
        tipoCondicao,
        solicitanteFiltro:
          tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE"
            ? solicitanteFiltro
            : null,
        ultimaVerificacaoEm: null,
      },
    });

    return NextResponse.json({ ok: true, regra });
  } catch (error) {
    console.error("Erro ao editar agendamento:", error);
    return erro("Não foi possível editar o agendamento.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await admin())) return erro("Acesso negado.", 403);

    const body = await request.json();
    const tarefaId = String(body?.tarefaId || "").trim();
    const regraId = String(body?.regraId || "").trim();
    const acao = String(body?.acao || "concluir").trim();

    if (regraId) {
      const regra = await prisma.regraTarefaGestor.findUnique({
        where: { id: regraId },
      });

      if (!regra) return erro("Agendamento não encontrado.", 404);

      const atualizada = await prisma.regraTarefaGestor.update({
        where: { id: regraId },
        data: { ativa: acao === "ativar" },
      });

      return NextResponse.json({ ok: true, regra: atualizada });
    }

    if (!tarefaId) return erro("Informe a tarefa.", 400);

    const tarefa = await prisma.tarefaGestor.findUnique({
      where: { id: tarefaId },
    });

    if (!tarefa) return erro("Tarefa não encontrada.", 404);

    const atualizada = await prisma.tarefaGestor.update({
      where: { id: tarefaId },
      data:
        acao === "reabrir"
          ? { concluida: false, concluidaEm: null }
          : { concluida: true, concluidaEm: new Date() },
    });

    return NextResponse.json({ ok: true, tarefa: atualizada });
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return erro("Não foi possível atualizar.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await admin())) return erro("Acesso negado.", 403);

    const body = await request.json();
    const regraId = String(body?.regraId || "").trim();

    if (!regraId) return erro("Informe o agendamento.", 400);

    await prisma.regraTarefaGestor.delete({
      where: { id: regraId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    return erro("Não foi possível excluir o agendamento.", 500);
  }
}
