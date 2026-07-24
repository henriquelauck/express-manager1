export type FormaCobrancaCliente = "NA_HORA" | "SEMANAL";

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  endereco1: string;
  endereco2: string;
  formaCobranca?: FormaCobrancaCliente;
};
