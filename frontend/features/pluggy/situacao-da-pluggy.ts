import type { PainelDaPluggy } from "./services/pluggy";

// Textos da tela da Pluggy. Funções puras: quem chama passa o `agora`.

const HORA = 60 * 60 * 1000;
const LIMITE_DE_DADO_PARADO = 48 * HORA;

type OrigemDaConta = { origem: "PLUGGY" | "ARQUIVO"; atualizado_em: string | null };

export const haQuanto = (iso: string, agora: Date): string => {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
};

export const origemDaConta = (conta: OrigemDaConta, agora: Date): string => {
  if (conta.origem !== "PLUGGY") return "Por arquivo";
  const quando = conta.atualizado_em ? ` · atualizado ${haQuanto(conta.atualizado_em, agora)}` : "";
  return `Automático (Pluggy)${quando}`;
};

/**
 * A faixa do painel da Plataforma; `null` quando nenhuma conexão caiu.
 *
 * Conta empresas, e não conexões: a empresa com lojas de donos diferentes tem
 * uma conexão por titular, e duas caídas dela ainda são "a Pluggy da X".
 */
export const textoDaFaixa = (painel: PainelDaPluggy): string | null => {
  const empresas = new Map(
    painel.conexoes
      .filter((c) => c.estado === "COM_ERRO")
      .map((c) => [c.empresa.id, c.empresa.nome]),
  );
  if (empresas.size === 0) return null;
  if (empresas.size === 1) return `A Pluggy da ${[...empresas.values()][0]} caiu — ver`;
  return `A Pluggy de ${empresas.size} empresas caiu — ver`;
};

// Peça por peça, e não o texto inteiro do toLocaleString: o separador entre
// data e hora muda conforme a versão do ICU. h23 para a meia-noite ser 00.
const DIA_E_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const diaEHora = (data: Date) => {
  const parte = Object.fromEntries(
    DIA_E_HORA.formatToParts(data).map(({ type, value }) => [type, value]),
  );
  return { dia: `${parte.day}/${parte.month}`, hora: `${parte.hour}:${parte.minute}` };
};

/** Aviso do extrato: a conta Pluggy mais antiga parada há mais de 48 h. */
export const avisoDeParado = (contas: OrigemDaConta[], agora: Date): string | null => {
  const datas = contas
    .filter((c) => c.origem === "PLUGGY" && c.atualizado_em)
    .map((c) => new Date(c.atualizado_em as string))
    .sort((a, b) => a.getTime() - b.getTime());
  const maisAntiga = datas[0];
  if (!maisAntiga || agora.getTime() - maisAntiga.getTime() <= LIMITE_DE_DADO_PARADO) return null;
  const { dia, hora } = diaEHora(maisAntiga);
  return `A conexão com o banco não atualiza desde ${dia} às ${hora}`;
};
