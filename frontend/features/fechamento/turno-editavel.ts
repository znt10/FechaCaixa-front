import { ORDEM_DO_DIA, rotuloDoPeriodo } from "./painel-dados";
import type { Periodo } from "./services/fechamentos";
import type { FechamentoLido } from "./services/painel";

/**
 * A correcao do turno no cartao do Por loja.
 *
 * Quem fecha a tarde as vezes escolhe "Manha" no formulario, e o painel passa
 * a mostrar duas manhas e nenhuma tarde. Antes o unico conserto era cancelar
 * e relancar, jogando fora o caixa certo junto.
 */

/**
 * Os turnos do seletor: os que o servidor diz que existem no dia, e o atual.
 *
 * O atual entra mesmo quando o dia nao o tem mais — a manha lancada antes de
 * a padroeira entrar no cadastro. Sem ele o seletor abriria em branco, e
 * salvar o PIX mudaria o turno junto, sem ninguem ter pedido.
 *
 * `doDia` indefinido e o servidor ainda sem responder: fica so o atual, e o
 * seletor nao oferece um turno que talvez nao exista.
 */
export const opcoesDeTurno = (
  doDia: Periodo[] | undefined,
  atual: Periodo,
): Periodo[] =>
  ORDEM_DO_DIA.filter(
    (periodo) => periodo === atual || (doDia ?? []).includes(periodo),
  );

/**
 * A pergunta antes de mover o lancamento para um turno que ja tem outro.
 *
 * Nao bloqueia: quando os dois da loja trocam os turnos entre si, a manha
 * esta na tarde e a tarde na manha, e bloquear deixaria os dois presos. Mas
 * ninguem move para um turno ocupado sem saber — dois caixas no mesmo turno
 * somam como se a loja tivesse vendido o dobro.
 *
 * `outros` sao os demais lancamentos da mesma loja no mesmo dia.
 */
export const avisoDeTurnoOcupado = (
  destino: Periodo,
  outros: FechamentoLido[],
  umFechamentoPorDia: boolean,
): string | null => {
  const ocupantes = outros.filter((lancado) => lancado.periodo === destino);
  if (ocupantes.length === 0) return null;

  const nome = rotuloDoPeriodo(destino, umFechamentoPorDia).toLowerCase();
  // Manha e tarde sao femininos; domingo, feriado e dia, masculinos.
  const artigo = destino === "MANHA" || destino === "TARDE" ? "a" : "o";
  const quem = ocupantes.map((lancado) => lancado.nome_funcionario).join(" e ");

  return (
    `${artigo.toUpperCase()} ${nome} deste dia já tem o lançamento de ${quem}. ` +
    `Mover mesmo assim? Os dois ficam n${artigo} ${nome} até você corrigir um deles.`
  );
};
