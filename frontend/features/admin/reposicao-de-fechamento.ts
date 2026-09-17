import { ehDomingo, somarDias } from "@/features/fechamento/painel-dados";
import type { FechamentoLido } from "@/features/fechamento/services/painel";
import type { Periodo } from "@/features/fechamento/services/fechamentos";

/**
 * As duas regras da reposicao que a tela precisa saber antes de enviar.
 *
 * Nenhuma delas substitui o servidor — ele recusa dia fora da janela e turno
 * repetido de qualquer jeito. Elas existem para o gerente nao preencher trinta
 * campos e so descobrir no envio que o dia nao valia.
 */

/** O mesmo numero do `DIAS_PARA_REPOR` do serializer. Repor dia esquecido e
 *  coisa de dias: passado isso o caixa daquele dia ja virou relatorio fechado.
 *
 *  Se um dos dois lados mudar, este e o par a acertar junto — apertada demais,
 *  a tela esconde um dia que o servidor aceitaria; folgada demais, ela promete
 *  um dia que o servidor recusa. */
export const DIAS_PARA_REPOR = 30;

/** O `min` e o `max` do seletor de data. */
export const limitesDoSeletor = (hoje: string) => ({
  min: somarDias(hoje, -DIAS_PARA_REPOR),
  max: hoje,
});

/**
 * O dia escolhido cabe na janela.
 *
 * O seletor ja carrega min e max, mas navegador nenhum garante isso quando a
 * data e digitada em vez de escolhida no calendario — e o botao de enviar
 * precisa de uma resposta que nao dependa disso.
 */
export const dentroDaJanela = (dia: string, hoje: string) => {
  const { min, max } = limitesDoSeletor(hoje);
  return dia >= min && dia <= max;
};

/**
 * Aquele turno daquela loja ja tem caixa lancado.
 *
 * Recebe os fechamentos do dia inteiro (uma chamada so alimenta os tres
 * turnos) e olha loja e periodo juntos: a mesma manha de outra loja e um
 * lancamento legitimo, e a tarde da mesma loja tambem.
 *
 * Cancelado nao aparece aqui — a listagem do painel ja o esconde, e e por isso
 * que desfazer um lancamento errado devolve o lugar ao turno.
 */
export const turnoJaLancado = (
  doDia: FechamentoLido[],
  loja: string,
  periodo: Periodo,
) => doDia.some((lancado) => lancado.loja === loja && lancado.periodo === periodo);

/** Como um dia aparece no calendario da reposicao. */
export type MarcaDoDia = "sem-caixa" | "incompleto" | "fechado" | "fora-da-janela";

/**
 * A marca de cada dia do calendario, para uma loja.
 *
 * E o que responde "qual dia a gente esqueceu?" antes de o gerente escolher:
 * sem isso ele adivinha um dia, preenche a tela e so entao descobre que aquele
 * turno ja tinha caixa.
 *
 * Por loja, e nao pela empresa toda: o buraco e de uma loja: a Centro ter
 * fechado a terca nao diz nada sobre a do Bairro.
 *
 * PONTO CEGO CONHECIDO — feriado. Quantos turnos um dia devia ter depende de
 * domingo E de feriado, e a lista de feriados (nacionais + os locais da conta)
 * mora no backend de proposito: uma copia dela aqui divergiria. Domingo da
 * para saber pelo calendario; feriado nao. Entao um feriado ja fechado com o
 * turno unico aparece como "incompleto", pedindo uma tarde que nunca existiu.
 *
 * Fica assim porque o custo esta do lado certo: a marca so escolhe uma cor. O
 * gerente que clicar nesse dia recebe do servidor a lista de turnos correta
 * (`/turnos/?data=`), que ja conhece o feriado, e o aviso de turno ocupado
 * fecha o caminho. O contrario — perguntar ao servidor por cada um dos 42 dias
 * da grade so para pintar uma bolinha — seria 42 chamadas para folhear um mes.
 */
export const marcarOsDias = ({
  doMes,
  loja,
  fechamentosPorDia,
  hoje,
}: {
  doMes: FechamentoLido[];
  loja: string;
  fechamentosPorDia: 1 | 2;
  hoje: string;
}) => {
  return (dia: string): MarcaDoDia => {
    if (!dentroDaJanela(dia, hoje)) return "fora-da-janela";

    const esperados = fechamentosPorDia === 1 || ehDomingo(dia) ? 1 : 2;
    const lancados = doMes.filter(
      (lancado) => lancado.loja === loja && lancado.data === dia,
    ).length;

    if (lancados === 0) return "sem-caixa";
    return lancados >= esperados ? "fechado" : "incompleto";
  };
};

/**
 * O tom com que o calendario pinta cada estado.
 *
 * Os tres sao os mesmos pares que o painel ja usa nos pills de status —
 * LANCADO, REVISAR e AUSENTE (ver CORES_STATUS em /fechamentos). Reusar o
 * vocabulario e o ponto: quem aprendeu que vermelho-claro e "nao lancou" na
 * tela de fechamentos le o calendario sem legenda nenhuma.
 *
 * Fora da janela nao ganha tom porque o dia ja aparece apagado e nao clicavel:
 * pintar por cima diria que ha algo a fazer ali.
 */
export const tomDoDia = (marca: MarcaDoDia): "ok" | "atencao" | "alerta" | null => {
  if (marca === "fechado") return "ok";
  if (marca === "incompleto") return "atencao";
  if (marca === "sem-caixa") return "alerta";
  return null;
};
