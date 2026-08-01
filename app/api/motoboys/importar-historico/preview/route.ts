import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { read, utils } from "xlsx";

export const runtime = "nodejs";

const NOME_ABA = "IMPORTACAO_EXPRESS_MANAGER";

const CABECALHOS_OBRIGATORIOS = [
  "ANO",
  "MES",
  "FATURAMENTO_TRABALHO",
  "FEITO_POR_FORA",
  "GASOLINA",
  "MANUTENCAO",
  "DIAS_TRABALHADOS",
  "OBSERVACOES",
] as const;

const MESES: Record<string, number> = {
  "1": 1,
  "01": 1,
  JANEIRO: 1,
  JAN: 1,
  "2": 2,
  "02": 2,
  FEVEREIRO: 2,
  FEV: 2,
  "3": 3,
  "03": 3,
  MARCO: 3,
  MAR: 3,
  "4": 4,
  "04": 4,
  ABRIL: 4,
  ABR: 4,
  "5": 5,
  "05": 5,
  MAIO: 5,
  MAI: 5,
  "6": 6,
  "06": 6,
  JUNHO: 6,
  JUN: 6,
  "7": 7,
  "07": 7,
  JULHO: 7,
  JUL: 7,
  "8": 8,
  "08": 8,
  AGOSTO: 8,
  AGO: 8,
  "9": 9,
  "09": 9,
  SETEMBRO: 9,
  SET: 9,
  "10": 10,
  OUTUBRO: 10,
  OUT: 10,
  "11": 11,
  NOVEMBRO: 11,
  NOV: 11,
  "12": 12,
  DEZEMBRO: 12,
  DEZ: 12,
};

type RegistroPreview = {
  linha: number;
  ano: number;
  mes: number;
  mesNome: string;
  faturamentoTrabalho: number;
  feitoPorFora: number;
  gasolina: number;
  manutencao: number;
  diasTrabalhados: number | null;
  observacoes: string | null;
  faturamentoTotal: number;
  despesasTotais: number;
  resultadoLiquido: number;
};

function respostaErro(mensagem: string, status: number, detalhes?: unknown) {
  return NextResponse.json(
    {
      erro: mensagem,
      ...(detalhes ? { detalhes } : {}),
    },
    { status }
  );
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function valorEhErro(valor: unknown) {
  const texto = String(valor ?? "").trim().toUpperCase();

  return (
    texto.startsWith("#") ||
    ["N/A", "NA", "ERRO", "ERROR", "NULL", "UNDEFINED"].includes(texto)
  );
}

function converterNumero(valor: unknown) {
  if (valorEhErro(valor) || valor === null || valor === undefined || valor === "") {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "");

  if (!texto) {
    return 0;
  }

  let normalizado = texto;

  if (texto.includes(",") && texto.includes(".")) {
    normalizado = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    normalizado = texto.replace(",", ".");
  }

  const numero = Number(normalizado);

  return Number.isFinite(numero) ? numero : 0;
}

function converterInteiroOpcional(valor: unknown) {
  if (valorEhErro(valor) || valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Math.trunc(converterNumero(valor));

  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function converterMes(valor: unknown) {
  const chave = normalizarTexto(valor).replace(/_/g, "");

  return MESES[chave] ?? null;
}

function nomeMes(mes: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(Date.UTC(2026, mes - 1, 1)));
}

async function obterMotoboyAutenticado() {
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
      role: true,
      motoboy: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return null;
  }

  return usuario.motoboy;
}

export async function POST(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return respostaErro("Nenhuma planilha foi enviada.", 400);
    }

    const extensao = arquivo.name.split(".").pop()?.toLowerCase();

    if (!["xlsx", "xls"].includes(extensao || "")) {
      return respostaErro(
        "Envie uma planilha no formato .xlsx ou .xls.",
        400
      );
    }

    if (arquivo.size <= 0) {
      return respostaErro("O arquivo enviado está vazio.", 400);
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      return respostaErro(
        "A planilha deve possuir no máximo 10 MB.",
        400
      );
    }

    const bytes = await arquivo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hashArquivo = createHash("sha256").update(buffer).digest("hex");

    const workbook = read(bytes, {
      type: "array",
      cellDates: true,
      cellFormula: false,
    });

    const nomeAbaEncontrada = workbook.SheetNames.find(
      (nome) => normalizarTexto(nome) === NOME_ABA
    );

    if (!nomeAbaEncontrada) {
      return respostaErro(
        `A planilha precisa conter uma aba chamada ${NOME_ABA}.`,
        400,
        {
          abasEncontradas: workbook.SheetNames,
        }
      );
    }

    const worksheet = workbook.Sheets[nomeAbaEncontrada];

    const linhas = utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });

    if (linhas.length < 2) {
      return respostaErro(
        `A aba ${NOME_ABA} não possui registros para importar.`,
        400
      );
    }

    const cabecalhosOriginais = Array.isArray(linhas[0]) ? linhas[0] : [];
    const cabecalhosNormalizados = cabecalhosOriginais.map(normalizarTexto);

    const indices = new Map<string, number>();

    for (const cabecalho of CABECALHOS_OBRIGATORIOS) {
      const indice = cabecalhosNormalizados.indexOf(cabecalho);

      if (indice < 0) {
        return respostaErro(
          `A coluna obrigatória ${cabecalho} não foi encontrada.`,
          400,
          {
            cabecalhosEncontrados: cabecalhosOriginais,
            cabecalhosEsperados: CABECALHOS_OBRIGATORIOS,
          }
        );
      }

      indices.set(cabecalho, indice);
    }

    const registros: RegistroPreview[] = [];
    const avisos: string[] = [];
    const mesesEncontrados = new Set<string>();

    for (let indiceLinha = 1; indiceLinha < linhas.length; indiceLinha += 1) {
      const linha = linhas[indiceLinha];

      if (!Array.isArray(linha)) {
        continue;
      }

      const linhaPlanilha = indiceLinha + 1;

      const anoBruto = linha[indices.get("ANO")!];
      const mesBruto = linha[indices.get("MES")!];

      const linhaTotalmenteVazia = linha.every(
        (valor) => valor === null || valor === undefined || String(valor).trim() === ""
      );

      if (linhaTotalmenteVazia) {
        continue;
      }

      const ano = Math.trunc(converterNumero(anoBruto));
      const mes = converterMes(mesBruto);

      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        avisos.push(
          `Linha ${linhaPlanilha}: ignorada porque o ano é inválido.`
        );
        continue;
      }

      if (!mes) {
        avisos.push(
          `Linha ${linhaPlanilha}: ignorada porque o mês é inválido.`
        );
        continue;
      }

      const chaveMes = `${ano}-${String(mes).padStart(2, "0")}`;

      if (mesesEncontrados.has(chaveMes)) {
        return respostaErro(
          `Existem duas linhas para ${nomeMes(mes)} de ${ano}. Mantenha somente uma linha por mês.`,
          400
        );
      }

      mesesEncontrados.add(chaveMes);

      const faturamentoTrabalho = Math.max(
        0,
        converterNumero(linha[indices.get("FATURAMENTO_TRABALHO")!])
      );

      const feitoPorFora = Math.max(
        0,
        converterNumero(linha[indices.get("FEITO_POR_FORA")!])
      );

      const gasolina = Math.abs(
        converterNumero(linha[indices.get("GASOLINA")!])
      );

      const manutencao = Math.abs(
        converterNumero(linha[indices.get("MANUTENCAO")!])
      );

      const diasTrabalhados = converterInteiroOpcional(
        linha[indices.get("DIAS_TRABALHADOS")!]
      );

      const observacaoBruta = linha[indices.get("OBSERVACOES")!];
      const observacoes =
        valorEhErro(observacaoBruta) || observacaoBruta === null
          ? null
          : String(observacaoBruta).trim() || null;

      const faturamentoTotal = faturamentoTrabalho + feitoPorFora;
      const despesasTotais = gasolina + manutencao;
      const resultadoLiquido = faturamentoTotal - despesasTotais;

      const possuiAlgumValor =
        faturamentoTrabalho > 0 ||
        feitoPorFora > 0 ||
        gasolina > 0 ||
        manutencao > 0 ||
        diasTrabalhados !== null ||
        Boolean(observacoes);

      if (!possuiAlgumValor) {
        avisos.push(
          `Linha ${linhaPlanilha}: ${nomeMes(mes)} de ${ano} foi ignorado por não possuir dados.`
        );
        mesesEncontrados.delete(chaveMes);
        continue;
      }

      registros.push({
        linha: linhaPlanilha,
        ano,
        mes,
        mesNome: nomeMes(mes),
        faturamentoTrabalho: Number(faturamentoTrabalho.toFixed(2)),
        feitoPorFora: Number(feitoPorFora.toFixed(2)),
        gasolina: Number(gasolina.toFixed(2)),
        manutencao: Number(manutencao.toFixed(2)),
        diasTrabalhados,
        observacoes,
        faturamentoTotal: Number(faturamentoTotal.toFixed(2)),
        despesasTotais: Number(despesasTotais.toFixed(2)),
        resultadoLiquido: Number(resultadoLiquido.toFixed(2)),
      });
    }

    if (registros.length === 0) {
      return respostaErro(
        "Nenhum mês válido foi encontrado para importação.",
        400,
        { avisos }
      );
    }

    registros.sort((a, b) => {
      if (a.ano !== b.ano) {
        return a.ano - b.ano;
      }

      return a.mes - b.mes;
    });

    const totais = registros.reduce(
      (acumulado, registro) => {
        acumulado.faturamentoTrabalho += registro.faturamentoTrabalho;
        acumulado.feitoPorFora += registro.feitoPorFora;
        acumulado.gasolina += registro.gasolina;
        acumulado.manutencao += registro.manutencao;
        acumulado.faturamentoTotal += registro.faturamentoTotal;
        acumulado.despesasTotais += registro.despesasTotais;
        acumulado.resultadoLiquido += registro.resultadoLiquido;

        if (registro.diasTrabalhados !== null) {
          acumulado.diasTrabalhados += registro.diasTrabalhados;
        }

        return acumulado;
      },
      {
        faturamentoTrabalho: 0,
        feitoPorFora: 0,
        gasolina: 0,
        manutencao: 0,
        faturamentoTotal: 0,
        despesasTotais: 0,
        resultadoLiquido: 0,
        diasTrabalhados: 0,
      }
    );

    const importacaoExistente =
      await prisma.importacaoHistoricoMotoboy.findUnique({
        where: {
          motoboyId_hashArquivo: {
            motoboyId: motoboy.id,
            hashArquivo,
          },
        },
        select: {
          id: true,
          nomeArquivo: true,
          createdAt: true,
        },
      });

    const mesesJaExistentes =
      await prisma.historicoMensalMotoboy.findMany({
        where: {
          motoboyId: motoboy.id,
          OR: registros.map((registro) => ({
            ano: registro.ano,
            mes: registro.mes,
          })),
        },
        select: {
          ano: true,
          mes: true,
        },
      });

    return NextResponse.json({
      arquivo: {
        nome: arquivo.name,
        tamanho: arquivo.size,
        hash: hashArquivo,
      },
      motoboy: {
        id: motoboy.id,
        nome: motoboy.nome,
      },
      abaProcessada: nomeAbaEncontrada,
      quantidadeRegistros: registros.length,
      anosEncontrados: Array.from(
        new Set(registros.map((registro) => registro.ano))
      ).sort((a, b) => a - b),
      totais: {
        faturamentoTrabalho: Number(totais.faturamentoTrabalho.toFixed(2)),
        feitoPorFora: Number(totais.feitoPorFora.toFixed(2)),
        gasolina: Number(totais.gasolina.toFixed(2)),
        manutencao: Number(totais.manutencao.toFixed(2)),
        faturamentoTotal: Number(totais.faturamentoTotal.toFixed(2)),
        despesasTotais: Number(totais.despesasTotais.toFixed(2)),
        resultadoLiquido: Number(totais.resultadoLiquido.toFixed(2)),
        diasTrabalhados: totais.diasTrabalhados,
      },
      importacaoDuplicada: importacaoExistente
        ? {
            id: importacaoExistente.id,
            nomeArquivo: importacaoExistente.nomeArquivo,
            importadaEm: importacaoExistente.createdAt,
          }
        : null,
      mesesJaExistentes: mesesJaExistentes.map((item) => ({
        ano: item.ano,
        mes: item.mes,
        mesNome: nomeMes(item.mes),
      })),
      avisos,
      registros,
    });
  } catch (erro) {
    console.error("Erro ao gerar prévia do histórico do motoboy:", erro);

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível ler a planilha.",
      500
    );
  }
}
