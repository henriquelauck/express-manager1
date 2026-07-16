export type PedidoInterpretado = {
  intencao:
    | "SOLICITAR_TELE"
    | "CONSULTAR_STATUS"
    | "CONSULTAR_VALOR"
    | "FALAR_HUMANO"
    | "DESCONHECIDO";

  solicitante: string | null;

  paradas: {
    tipo: "Coleta" | "Entrega";
    cliente: string;
  }[];

  informacoesFaltantes: string[];

  precisaHumano: boolean;
};