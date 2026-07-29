import { prisma } from "@/lib/prisma";
import type { TipoTarefaGestor } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const FUSO_BRASIL = "America/Sao_Paulo";
const HORA_GERACAO = 19;

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json(
    {
      erro: mensagem,
    },
    {
      status,
    }
  );
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function partesDataBrasil(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(data);

  const obter = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return {
    ano: Number(obter("year")),
    mes: Number(obter("month")),
    dia: Number(obter("day")),
    hora: Number(obter("hour")),
  };
}

function dataReferenciaBrasil(data = new Date()) {
  const { ano, mes, dia } = partesDataBrasil(data);

  return new Date(
    `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`
  );
}

function intervaloDiaBrasil(data = new Date()) {
  const { ano, mes, dia } = partesDataBrasil(data);
  const dataTexto = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  return {
    inicio: new Date(`${dataTexto}T00:00:00-03:00`),
    fim: new Date(`${dataTexto}T23:59:59.999-03:00`),
  };
}

function intervaloSemanaBrasil(data = new Date()) {
  const referencia = dataReferenciaBrasil(data);
  const diaSemana = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO_BRASIL,
      weekday: "short",
    }).format(data) === "Sun"
      ? 0
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
          new Intl.DateTimeFormat("en-US", {
            timeZone: FUSO_BRASIL,
            weekday: "short",
          }).format(data)
        ) + 1
  );

  const inicio = new Date(referencia);
  inicio.setUTCDate(inicio.getUTCDate() - diaSemana);
  inicio.setUTCHours(3, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 6);
  fim.setUTCHours(26, 59, 59, 999);

  return {
    inicio,
    fim,
  };
}

function diaSemanaBrasil(data = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_BRASIL,
    weekday: "short",
  }).format(data);
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

async function validarAdministrador() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return null;
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!usuario || usuario.role !== "ADMIN") {
    return null;
  }

  return usuario;
}

async function salvarTarefaDiaria({
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
    where: {
      tipo_dataReferencia: {
        tipo,
        dataReferencia,
      },
    },
  });

  if (existente?.concluida) {
    return existente;
  }

  if (existente) {
    return prisma.tarefaGestor.update({
      where: {
        id: existente.id,
      },
      data: {
        titulo,
        descricao,
        valor,
        quantidadeTeles,
        teleIds,
      },
    });
  }

  return prisma.tarefaGestor.create({
    data: {
      tipo,
      dataReferencia,
      titulo,
      descricao,
      valor,
      quantidadeTeles,
      teleIds,
    },
  });
}

async function gerarTarefasDoDia() {
  const agora = new Date();
  const { hora } = partesDataBrasil(agora);

  if (hora < HORA_GERACAO) {
    return;
  }

  const dataReferencia = dataReferenciaBrasil(agora);
  const { inicio, fim } = intervaloDiaBrasil(agora);

  const telesDoDia = await prisma.tele.findMany({
    where: {
      dataTele: {
        gte: inicio,
        lte: fim,
      },
    },
    select: {
      id: true,
      solicitante: true,
      total: true,
      valorRecebido: true,
    },
  });

  const telesMarcos = telesDoDia.filter((tele) =>
    normalizarTexto(tele.solicitante).includes("marcos moto pecas")
  );

  if (telesMarcos.length > 0) {
    const valorMarcos = telesMarcos.reduce((total, tele) => total + Number(tele.total || 0), 0);

    await salvarTarefaDiaria({
      tipo: "MARCOS_MANUTENCOES",
      dataReferencia,
      titulo: "Abater teles do Marcos Moto Peças",
      descricao: `Abater R$ ${valorMarcos
        .toFixed(2)
        .replace(".", ",")} do saldo de manutenções do Marcos Moto Peças.`,
      valor: valorMarcos,
      quantidadeTeles: telesMarcos.length,
      teleIds: telesMarcos.map((tele) => tele.id),
    });
  }

  const telesSaveCellPendentes = telesDoDia
    .filter((tele) => normalizarTexto(tele.solicitante).includes("savecell"))
    .map((tele) => ({
      ...tele,
      saldoPendente: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
    }))
    .filter((tele) => tele.saldoPendente > 0.009);

  if (telesSaveCellPendentes.length > 0) {
    const valorSaveCell = telesSaveCellPendentes.reduce(
      (total, tele) => total + tele.saldoPendente,
      0
    );

    await salvarTarefaDiaria({
      tipo: "SAVECELL_PENDENCIAS",
      dataReferencia,
      titulo: "Descontar pendências da SaveCell",
      descricao: `Descontar ${formatarMoeda(valorSaveCell)} da conta com a SaveCell.`,
      valor: valorSaveCell,
      quantidadeTeles: telesSaveCellPendentes.length,
      teleIds: telesSaveCellPendentes.map((tele) => tele.id),
    });
  }

  const diaSemana = diaSemanaBrasil(agora);
  const { inicio: inicioSemana, fim: fimSemana } = intervaloSemanaBrasil(agora);

  if (diaSemana === "Fri" && hora >= 15) {
    const clientesEspeciais = ["oha botanica", "add cliches", "hardware"];

    const telesEspeciais = await prisma.tele.findMany({
      where: {
        dataTele: {
          gte: inicioSemana,
          lte: fimSemana,
        },
        fechamentoId: null,
      },
      select: {
        id: true,
        solicitante: true,
        total: true,
        valorRecebido: true,
      },
    });

    const pendenciasEspeciais = telesEspeciais
      .map((tele) => ({
        ...tele,
        nomeNormalizado: normalizarTexto(tele.solicitante),
        saldoPendente: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
      }))
      .filter(
        (tele) =>
          clientesEspeciais.some((cliente) => tele.nomeNormalizado.includes(cliente)) &&
          tele.saldoPendente > 0.009
      );

    if (pendenciasEspeciais.length > 0) {
      const valorTotal = pendenciasEspeciais.reduce((total, tele) => total + tele.saldoPendente, 0);

      const clientesEncontrados = Array.from(
        new Set(pendenciasEspeciais.map((tele) => tele.solicitante))
      );

      await salvarTarefaDiaria({
        tipo: "FECHAMENTO_SEXTA_ESPECIAIS",
        dataReferencia,
        titulo: "Enviar fechamentos de sexta-feira",
        descricao: `Enviar o fechamento de ${clientesEncontrados.join(
          ", "
        )}. Total pendente: ${formatarMoeda(valorTotal)}.`,
        valor: valorTotal,
        quantidadeTeles: pendenciasEspeciais.length,
        teleIds: pendenciasEspeciais.map((tele) => tele.id),
      });
    }
  }

  if (diaSemana === "Sat" && hora >= 16) {
    const clientesExcluidos = ["oha botanica", "add cliches", "hardware"];

    const telesDemaisClientes = await prisma.tele.findMany({
      where: {
        dataTele: {
          gte: inicioSemana,
          lte: fimSemana,
        },
        fechamentoId: null,
      },
      select: {
        id: true,
        solicitante: true,
        total: true,
        valorRecebido: true,
      },
    });

    const pendenciasDemaisClientes = telesDemaisClientes
      .map((tele) => ({
        ...tele,
        nomeNormalizado: normalizarTexto(tele.solicitante),
        saldoPendente: Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0),
      }))
      .filter(
        (tele) =>
          !clientesExcluidos.some((cliente) => tele.nomeNormalizado.includes(cliente)) &&
          tele.saldoPendente > 0.009
      );

    if (pendenciasDemaisClientes.length > 0) {
      const valorTotal = pendenciasDemaisClientes.reduce(
        (total, tele) => total + tele.saldoPendente,
        0
      );

      const clientesEncontrados = Array.from(
        new Set(pendenciasDemaisClientes.map((tele) => tele.solicitante))
      );

      await salvarTarefaDiaria({
        tipo: "FECHAMENTO_SABADO_DEMAIS",
        dataReferencia,
        titulo: "Enviar fechamentos dos demais clientes",
        descricao: `Enviar o fechamento de ${clientesEncontrados.length} ${
          clientesEncontrados.length === 1 ? "cliente" : "clientes"
        } em aberto. Total pendente: ${formatarMoeda(valorTotal)}.`,
        valor: valorTotal,
        quantidadeTeles: pendenciasDemaisClientes.length,
        teleIds: pendenciasDemaisClientes.map((tele) => tele.id),
      });
    }
  }
}

export async function GET() {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    await gerarTarefasDoDia();

    const tarefas = await prisma.tarefaGestor.findMany({
      where: {
        concluida: false,
      },
      orderBy: [
        {
          dataReferencia: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return NextResponse.json(tarefas);
  } catch (erro) {
    console.error("Erro ao carregar tarefas do gestor:", erro);

    return respostaErro("Não foi possível carregar as tarefas do gestor.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = await request.json();
    const tarefaId = String(body?.tarefaId || "").trim();

    if (!tarefaId) {
      return respostaErro("Informe a tarefa.", 400);
    }

    const tarefa = await prisma.tarefaGestor.findUnique({
      where: {
        id: tarefaId,
      },
    });

    if (!tarefa) {
      return respostaErro("Tarefa não encontrada.", 404);
    }

    const tarefaAtualizada = await prisma.tarefaGestor.update({
      where: {
        id: tarefa.id,
      },
      data: {
        concluida: true,
        concluidaEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      tarefa: tarefaAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao concluir tarefa do gestor:", erro);

    return respostaErro("Não foi possível concluir a tarefa.", 500);
  }
}
