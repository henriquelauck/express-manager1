export function carregarDados<T>(chave: string, valorPadrao: T): T {
  if (typeof window === "undefined") {
    return valorPadrao;
  }

  const dados = localStorage.getItem(chave);

  if (!dados) {
    return valorPadrao;
  }

  try {
    return JSON.parse(dados);
  } catch {
    return valorPadrao;
  }
}

export function salvarDados<T>(chave: string, dados: T) {
  if (typeof window === "undefined") return;

  localStorage.setItem(chave, JSON.stringify(dados));
}