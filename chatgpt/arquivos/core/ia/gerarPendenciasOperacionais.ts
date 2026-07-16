type OrigemSolicitante = "TELEFONE_REMETENTE" | "MENSAGEM" | null;

type ParadaOperacional = {
  tipo: string;
  texto: string;
  textoOriginal?: string | null;
  cliente: string | null;
  endereco?: string | null;
};

type GerarPendenciasOperacionaisParams = {
  intencao: string;

  solicitante: string | null;

  origemSolicitante: OrigemSolicitante;

  telefoneRemetente: string;

  telefoneVinculadoAoCliente: boolean;

  paradas: ParadaOperacional[];
};

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function possuiTipoParada(paradas: ParadaOperacional[], tipoProcurado: "coleta" | "entrega") {
  return paradas.some((parada) => normalizarTexto(parada.tipo).includes(tipoProcurado));
}

function descreverParada(parada: ParadaOperacional, index: number) {
  const tipo = parada.tipo?.trim();

  if (tipo) {
    return tipo.toLowerCase();
  }

  return `parada ${index + 1}`;
}

export function gerarPendenciasOperacionais({
  intencao,
  solicitante,
  origemSolicitante,
  telefoneRemetente,
  telefoneVinculadoAoCliente,
  paradas,
}: GerarPendenciasOperacionaisParams) {
  const pendencias: string[] = [];

  if (intencao !== "CRIAR_TELE") {
    pendencias.push("A mensagem não representa uma solicitação de tele.");

    return pendencias;
  }

  /*
   * Em produção, o número do WhatsApp será a principal
   * identificação do solicitante.
   */
  if (!telefoneRemetente.trim()) {
    pendencias.push("Telefone do remetente não informado.");
  } else if (!telefoneVinculadoAoCliente) {
    pendencias.push(
      `O telefone do remetente "${telefoneRemetente}" não está vinculado a nenhum cliente cadastrado.`
    );
  }

  if (!solicitante) {
    pendencias.push("Solicitante não identificado.");
  }

  if (solicitante && origemSolicitante !== "TELEFONE_REMETENTE") {
    pendencias.push("O solicitante não foi confirmado pelo telefone do remetente.");
  }

  if (paradas.length === 0) {
    pendencias.push("Local de coleta não identificado.");

    pendencias.push("Local de entrega não identificado.");

    return Array.from(new Set(pendencias));
  }

  const possuiColeta = possuiTipoParada(paradas, "coleta");

  const possuiEntrega = possuiTipoParada(paradas, "entrega");

  if (!possuiColeta) {
    pendencias.push("Local de coleta não identificado.");
  }

  if (!possuiEntrega) {
    pendencias.push("Local de entrega não identificado.");
  }

  paradas.forEach((parada, index) => {
    const descricao = descreverParada(parada, index);

    const textoOriginal = parada.textoOriginal || parada.texto || descricao;

    if (!parada.cliente) {
      pendencias.push(
        `O local "${textoOriginal}" da ${descricao} não foi identificado com segurança.`
      );

      return;
    }

    if (!parada.endereco) {
      pendencias.push(`O cliente "${parada.cliente}" não possui endereço principal cadastrado.`);
    }
  });

  return Array.from(new Set(pendencias));
}
