import { prisma } from "@/lib/prisma";
import { getVercelOidcToken } from "@vercel/oidc";
import { ExternalAccountClient } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const FUSO = "America/Sao_Paulo";
const INTERVALO_BILLING_MS = 60 * 60 * 1000;

type ItemBilling = {
  servico: string;
  sku: string;
  moeda: string;
  custo: number;
};

type BillingResposta = {
  configurado: boolean;
  erro?: string;
  itens: ItemBilling[];
  total: number | null;
  moeda: string | null;
  consultadoEm?: string | null;
  cacheado?: boolean;
};

async function exigirAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "ADMIN";
}

function dataHojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function intervaloHojeSaoPaulo() {
  const data = dataHojeSaoPaulo();

  return {
    inicio: new Date(`${data}T00:00:00-03:00`),
    fim: new Date(`${data}T23:59:59.999-03:00`),
  };
}

function itensDoCache(valor: unknown): ItemBilling[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const registro = item as Record<string, unknown>;

      return {
        servico: String(registro.servico || ""),
        sku: String(registro.sku || ""),
        moeda: String(registro.moeda || ""),
        custo: Number(registro.custo || 0),
      };
    })
    .filter((item): item is ItemBilling => Boolean(item));
}

async function tokenGoogleOidc() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();

  if (!projectNumber || !serviceAccountEmail || !poolId || !providerId) {
    return null;
  }

  try {
    const authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      subject_token_supplier: {
        getSubjectToken: getVercelOidcToken,
      },
    });

    if (!authClient) {
      return null;
    }

    const acesso = await authClient.getAccessToken();

    return typeof acesso?.token === "string" && acesso.token
      ? acesso.token
      : null;
  } catch (erro) {
    console.error("Falha ao obter token Google via Vercel OIDC:", erro);
    return null;
  }
}

async function lerCacheBilling(chave: string): Promise<BillingResposta | null> {
  const cache = await prisma.cacheBillingApi.findUnique({
    where: { chave },
  });

  if (!cache) return null;

  return {
    configurado: true,
    erro: cache.erro || undefined,
    itens: itensDoCache(cache.itens),
    total: cache.total,
    moeda: cache.moeda,
    consultadoEm: cache.consultadoEm.toISOString(),
    cacheado: true,
  };
}

async function buscarBillingOficial(): Promise<BillingResposta> {
  const projeto =
    process.env.GCP_PROJECT_ID?.trim() ||
    process.env.GCP_BILLING_PROJECT_ID?.trim();

  const tabela = process.env.GCP_BILLING_TABLE?.trim();

  if (!projeto || !tabela) {
    return {
      configurado: false,
      itens: [],
      total: null,
      moeda: null,
    };
  }

  const dataReferencia = dataHojeSaoPaulo();
  const chave = `${projeto}:${dataReferencia}`;
  const agora = new Date();
  const limiteCache = new Date(agora.getTime() - INTERVALO_BILLING_MS);

  const cacheAtual = await prisma.cacheBillingApi.findUnique({
    where: { chave },
  });

  if (cacheAtual && cacheAtual.consultadoEm > limiteCache) {
    return {
      configurado: true,
      erro: cacheAtual.erro || undefined,
      itens: itensDoCache(cacheAtual.itens),
      total: cacheAtual.total,
      moeda: cacheAtual.moeda,
      consultadoEm: cacheAtual.consultadoEm.toISOString(),
      cacheado: true,
    };
  }

  let bloqueioAdquirido = false;

  if (cacheAtual) {
    const bloqueio = await prisma.cacheBillingApi.updateMany({
      where: {
        chave,
        consultadoEm: { lte: limiteCache },
      },
      data: {
        consultadoEm: agora,
      },
    });

    bloqueioAdquirido = bloqueio.count === 1;
  } else {
    try {
      await prisma.cacheBillingApi.create({
        data: {
          chave,
          projeto,
          dataReferencia,
          consultadoEm: agora,
          itens: [],
        },
      });

      bloqueioAdquirido = true;
    } catch {
      bloqueioAdquirido = false;
    }
  }

  if (!bloqueioAdquirido) {
    const cacheConcorrente = await lerCacheBilling(chave);

    if (cacheConcorrente) {
      return cacheConcorrente;
    }
  }

  const token = await tokenGoogleOidc();

  if (!token) {
    const mensagem =
      "OIDC do Google ainda não está autenticando. Verifique as variáveis GCP e a permissão Workload Identity User.";

    await prisma.cacheBillingApi.update({
      where: { chave },
      data: { erro: mensagem },
    });

    return {
      configurado: true,
      erro: mensagem,
      itens: cacheAtual ? itensDoCache(cacheAtual.itens) : [],
      total: cacheAtual?.total ?? null,
      moeda: cacheAtual?.moeda ?? null,
      consultadoEm: agora.toISOString(),
      cacheado: false,
    };
  }

  const query = `
    SELECT
      service.description AS servico,
      sku.description AS sku,
      ANY_VALUE(currency) AS moeda,
      SUM(cost) +
      SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS custo
    FROM \`${tabela}\`
    WHERE project.id = @projectId
      AND DATE(usage_start_time, "${FUSO}") = CURRENT_DATE("${FUSO}")
      AND (
        LOWER(service.description) LIKE "%maps%"
        OR LOWER(service.description) LIKE "%routes%"
        OR LOWER(service.description) LIKE "%geocod%"
      )
    GROUP BY servico, sku
    ORDER BY custo DESC
  `;

  const resposta = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(
      projeto
    )}/queries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        timeoutMs: 10000,
        parameterMode: "NAMED",
        queryParameters: [
          {
            name: "projectId",
            parameterType: { type: "STRING" },
            parameterValue: { value: projeto },
          },
        ],
      }),
      cache: "no-store",
    }
  );

  if (!resposta.ok) {
    const textoErro = await resposta.text();
    console.error("Falha ao consultar Billing Export:", textoErro);

    const mensagem = "Billing Export ainda não respondeu.";

    await prisma.cacheBillingApi.update({
      where: { chave },
      data: { erro: mensagem },
    });

    return {
      configurado: true,
      erro: mensagem,
      itens: cacheAtual ? itensDoCache(cacheAtual.itens) : [],
      total: cacheAtual?.total ?? null,
      moeda: cacheAtual?.moeda ?? null,
      consultadoEm: agora.toISOString(),
      cacheado: false,
    };
  }

  const dados = await resposta.json();
  const fields = dados?.schema?.fields || [];
  const nomes = fields.map((field: any) => field.name);

  const itens: ItemBilling[] = (dados?.rows || []).map((row: any) => {
    const objeto: Record<string, string> = {};

    row.f?.forEach((campo: any, indice: number) => {
      objeto[nomes[indice]] = String(campo?.v ?? "");
    });

    return {
      servico: objeto.servico || "",
      sku: objeto.sku || "",
      moeda: objeto.moeda || "",
      custo: Number(objeto.custo || 0),
    };
  });

  const total = itens.reduce((soma, item) => soma + item.custo, 0);
  const moeda = itens.find((item) => item.moeda)?.moeda || null;

  await prisma.cacheBillingApi.update({
    where: { chave },
    data: {
      total,
      moeda,
      itens,
      erro: null,
      consultadoEm: agora,
    },
  });

  return {
    configurado: true,
    itens,
    total,
    moeda,
    consultadoEm: agora.toISOString(),
    cacheado: false,
  };
}

export async function GET() {
  if (!(await exigirAdmin())) {
    return NextResponse.json(
      { erro: "Não autorizado." },
      { status: 403 }
    );
  }

  const { inicio, fim } = intervaloHojeSaoPaulo();

  const usos = await prisma.usoApiExterna.groupBy({
    by: ["servico", "sku"],
    where: {
      fornecedor: "GOOGLE_MAPS",
      createdAt: {
        gte: inicio,
        lte: fim,
      },
    },
    _sum: { quantidade: true },
  });

  const billing = await buscarBillingOficial();

  return NextResponse.json({
    atualizadoEm: new Date().toISOString(),
    usoInterno: usos.map((item) => ({
      servico: item.servico,
      sku: item.sku,
      quantidade: item._sum.quantidade || 0,
    })),
    billing,
  });
}
