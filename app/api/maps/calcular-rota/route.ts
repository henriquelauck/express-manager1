import {
  calcularRota,
  ErroCalculoRota,
  type ParadaCalculoRota,
} from "@/lib/google-maps/calcularRota";
import { NextResponse } from "next/server";

type CorpoCalculoRota = {
  paradas?: ParadaCalculoRota[];
  temRetorno?: boolean;
};

type ResultadoCalculoRota = Awaited<ReturnType<typeof calcularRota>>;

type EntradaCacheRota = {
  expiraEm: number;
  resultado: ResultadoCalculoRota;
};

const CACHE_TTL_MS = 15 * 60_000;
const CACHE_MAX_ITENS = 300;

const globalCache = globalThis as typeof globalThis & {
  __expressCacheCalculoRota?: Map<string, EntradaCacheRota>;
};

const cacheCalculoRota =
  globalCache.__expressCacheCalculoRota ?? new Map<string, EntradaCacheRota>();

globalCache.__expressCacheCalculoRota = cacheCalculoRota;

function normalizarEnderecoCache(valor: unknown) {
  return String(valor || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function criarChaveCache(body: CorpoCalculoRota) {
  return JSON.stringify({
    retorno: Boolean(body.temRetorno),
    paradas: (body.paradas || []).map((parada) => ({
      ...parada,
      endereco: normalizarEnderecoCache(
        (parada as { endereco?: unknown }).endereco
      ),
    })),
  });
}

function limparCacheExpirado(agora: number) {
  for (const [chave, entrada] of cacheCalculoRota) {
    if (entrada.expiraEm <= agora) {
      cacheCalculoRota.delete(chave);
    }
  }

  while (cacheCalculoRota.size > CACHE_MAX_ITENS) {
    const primeiraChave = cacheCalculoRota.keys().next().value as
      | string
      | undefined;

    if (!primeiraChave) break;
    cacheCalculoRota.delete(primeiraChave);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CorpoCalculoRota;
    const agora = Date.now();
    const chaveCache = criarChaveCache(body);

    limparCacheExpirado(agora);

    const salvo = cacheCalculoRota.get(chaveCache);

    if (salvo && salvo.expiraEm > agora) {
      return NextResponse.json(salvo.resultado, {
        headers: {
          "X-Express-Maps-Cache": "HIT",
        },
      });
    }

    const resultado = await calcularRota({
      paradas: body.paradas || [],
      temRetorno: Boolean(body.temRetorno),
    });

    cacheCalculoRota.set(chaveCache, {
      expiraEm: agora + CACHE_TTL_MS,
      resultado,
    });

    return NextResponse.json(resultado, {
      headers: {
        "X-Express-Maps-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("ERRO AO CALCULAR ROTA:", error);

    if (error instanceof ErroCalculoRota) {
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
        erro: error instanceof Error ? error.message : "Erro ao calcular rota.",
      },
      {
        status: 500,
      }
    );
  }
}