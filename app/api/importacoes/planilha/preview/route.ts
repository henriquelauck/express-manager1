import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { read, SSF, utils } from "xlsx";

export const runtime = "nodejs";

const MESES: Record<string, number> = {
  JANEIRO: 1,
  FEVEREIRO: 2,
  MARÇO: 3,
  MARCO: 3,
  ABRIL: 4,
  MAIO: 5,
  JUNHO: 6,
  JULHO: 7,
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZEMBRO: 12,
};

type RegistroPlanilha = {
  aba: string;
  data: string;
  clienteNomeOriginal: string;
  clienteId: string | null;
  clienteNomeSistema: string | null;
  valor: number;
};

function normalizarTexto(texto: unknown) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function formatarData(ano: number, mesEsperado: number, valor: unknown): string | null {
  let dia: number | null = null;
  let mes = mesEsperado;
  let anoData = ano;

  if (valor instanceof Date) {
    dia = valor.getUTCDate();
    mes = valor.getUTCMonth() + 1;
    anoData = valor.getUTCFullYear();
  } else if (typeof valor === "number" && Number.isFinite(valor)) {
    const dataExcel = SSF.parse_date_code(valor);

    if (!dataExcel) return null;

    dia = dataExcel.d;
    mes = dataExcel.m;
    anoData = dataExcel.y;
  } else if (typeof valor === "string") {
    const texto = valor.trim();

    const dataCompleta = texto.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);

    if (dataCompleta) {
      dia = Number(dataCompleta[1]);
      mes = Number(dataCompleta[2]);

      if (dataCompleta[3]) {
        const anoInformado = Number(dataCompleta[3]);

        anoData = anoInformado < 100 ? 2000 + anoInformado : anoInformado;
      }
    } else if (/^\d{1,2}$/.test(texto)) {
      dia = Number(texto);
    }
  }

  if (!dia || dia < 1 || dia > 31) {
    return null;
  }

  const data = new Date(Date.UTC(anoData, mes - 1, dia, 12, 0, 0));

  if (
    data.getUTCFullYear() !== anoData ||
    data.getUTCMonth() + 1 !== mes ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }

  return [anoData, String(mes).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
}

function converterValor(valor: unknown): number {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const numero = Number(
    String(valor || "0")
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".")
  );

  return Number.isFinite(numero) ? numero : 0;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const arquivo = formData.get("arquivo");
    const anoInformado = Number(formData.get("ano"));

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: "Nenhum arquivo foi enviado." }, { status: 400 });
    }

    if (!Number.isInteger(anoInformado) || anoInformado < 2000 || anoInformado > 2100) {
      return NextResponse.json({ erro: "Informe um ano válido." }, { status: 400 });
    }

    const extensao = arquivo.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extensao || "")) {
      return NextResponse.json(
        {
          erro: "Envie uma planilha no formato .xlsx ou .xls.",
        },
        { status: 400 }
      );
    }

    const bytes = await arquivo.arrayBuffer();

    const workbook = read(bytes, {
      type: "array",
      cellDates: true,
    });

    const clientesBanco = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    const clientesPorNome = new Map(
      clientesBanco.map((cliente) => [normalizarTexto(cliente.nome), cliente])
    );

    const registros: RegistroPlanilha[] = [];
    const abasProcessadas: string[] = [];
    const avisos: string[] = [];

    for (const nomeAbaOriginal of workbook.SheetNames) {
      const nomeAba = nomeAbaOriginal.trim().toUpperCase();

      const numeroMes = MESES[nomeAba];

      if (!numeroMes) {
        continue;
      }

      const worksheet = workbook.Sheets[nomeAbaOriginal];

      const linhas = utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      });

      if (linhas.length < 2) {
        avisos.push(`A aba "${nomeAbaOriginal}" não possui dados suficientes.`);
        continue;
      }

      const cabecalhos = linhas[0];

      if (!Array.isArray(cabecalhos)) {
        continue;
      }

      abasProcessadas.push(nomeAbaOriginal);

      for (let indiceLinha = 1; indiceLinha < linhas.length; indiceLinha += 1) {
        const linha = linhas[indiceLinha];

        if (!Array.isArray(linha)) {
          continue;
        }

        const data = formatarData(anoInformado, numeroMes, linha[0]);

        if (!data) {
          continue;
        }

        for (let indiceColuna = 1; indiceColuna < cabecalhos.length; indiceColuna += 1) {
          const nomeCliente = String(cabecalhos[indiceColuna] || "").trim();

          if (!nomeCliente) {
            continue;
          }

          const valor = converterValor(linha[indiceColuna]);

          if (valor <= 0) {
            continue;
          }

          const clienteSistema = clientesPorNome.get(normalizarTexto(nomeCliente));

          registros.push({
            aba: nomeAbaOriginal,
            data,
            clienteNomeOriginal: nomeCliente,
            clienteId: clienteSistema?.id ?? null,
            clienteNomeSistema: clienteSistema?.nome ?? null,
            valor: Number(valor.toFixed(2)),
          });
        }
      }
    }

    const nomesPlanilha = Array.from(
      new Set(registros.map((registro) => registro.clienteNomeOriginal))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const clientesNaoVinculados = nomesPlanilha
      .filter((nome) => {
        return !clientesPorNome.has(normalizarTexto(nome));
      })
      .map((nome) => ({
        nomePlanilha: nome,
      }));

    const total = registros.reduce((soma, registro) => soma + registro.valor, 0);

    const totaisPorMes = abasProcessadas.map((aba) => {
      const registrosMes = registros.filter((registro) => registro.aba === aba);

      return {
        mes: aba,
        quantidade: registrosMes.length,
        total: Number(registrosMes.reduce((soma, registro) => soma + registro.valor, 0).toFixed(2)),
      };
    });

    return NextResponse.json({
      arquivo: arquivo.name,
      ano: anoInformado,

      clientesSistema: clientesBanco.map((cliente) => ({
        id: cliente.id,
        nome: cliente.nome,
      })),

      abasEncontradas: workbook.SheetNames,
      abasProcessadas,

      quantidadeRegistros: registros.length,
      quantidadeClientes: nomesPlanilha.length,

      quantidadeVinculados: nomesPlanilha.length - clientesNaoVinculados.length,

      quantidadeNaoVinculados: clientesNaoVinculados.length,

      total: Number(total.toFixed(2)),

      totaisPorMes,
      clientesNaoVinculados,
      avisos,

      registros,
      amostra: registros.slice(0, 100),
    });
  } catch (error) {
    console.error("ERRO AO LER PLANILHA:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao ler a planilha.",
      },
      { status: 500 }
    );
  }
}
