import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

import {
  descartarBoleto,
  desfazerPagamento,
  editarBoleto,
  enviarBoletoDoPainel,
  listarBoletos,
  pagarBoleto,
  resumoDosBoletos,
  type EdicaoDoBoleto,
} from "../services/boletos";

/** Toda consulta do módulo mora embaixo desta chave: pagar muda a lista, a
 *  outra aba e o resumo da marquinha de uma vez, e invalidar a raiz pega os três. */
const RAIZ = "boletos";

// O boleto que a loja manda chega sozinho: quem deixa o painel aberto vê a
// faixa mudar sem apertar F5. O mesmo ritmo dos comprovantes.
const INTERVALO_DE_ATUALIZACAO = 60 * 1000;

export const useBoletos = (situacao: "A_PAGAR" | "PAGO") =>
  useQuery({
    queryKey: [RAIZ, "lista", situacao],
    queryFn: () => listarBoletos(situacao),
    staleTime: INTERVALO_DE_ATUALIZACAO,
  });

export const useResumoDosBoletos = ({ habilitado }: { habilitado: boolean }) =>
  useQuery({
    queryKey: [RAIZ, "resumo"],
    queryFn: resumoDosBoletos,
    enabled: habilitado,
    staleTime: INTERVALO_DE_ATUALIZACAO,
    refetchInterval: INTERVALO_DE_ATUALIZACAO,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

const useMudanca = <Entrada, Saida>(acao: (entrada: Entrada) => Promise<Saida>) => {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: acao,
    onSuccess: () => cliente.invalidateQueries({ queryKey: [RAIZ] }),
  });
};

export const useEditarBoleto = () =>
  useMudanca(({ id, edicao }: { id: string; edicao: EdicaoDoBoleto }) =>
    editarBoleto(id, edicao),
  );
export const usePagarBoleto = () => useMudanca(pagarBoleto);
export const useDesfazerPagamento = () => useMudanca(desfazerPagamento);
export const useDescartarBoleto = () => useMudanca(descartarBoleto);
export const useEnviarBoletoDoPainel = () => useMudanca(enviarBoletoDoPainel);

/**
 * A empresa usa boletos a pagar? (aba Boletos, faixa do painel.)
 *
 * Mesma fonte do `useCatalogoAtivo`, o `/user/me/`. Ao contrário do catálogo,
 * ausente conta como DESLIGADO: é coisa nova, e o backend de antes não tem a
 * tela para onde a aba levaria.
 */
export const useBoletosAtivos = () => {
  const usuario = useUsuarioAtual();
  return usuario.data?.modulos?.boletos === true;
};

const semAcento = (texto?: string) =>
  (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Quem paga os boletos: gerente e admin da empresa que ligou. É quem o
 *  servidor deixa ler o resumo — pedir para os outros só colheria 403. */
export const useBoletosDaGerencia = () => {
  const usuario = useUsuarioAtual();
  const cargo = semAcento(usuario.data?.group);
  return (
    usuario.data?.modulos?.boletos === true && (cargo === "gerente" || cargo === "admin")
  );
};
