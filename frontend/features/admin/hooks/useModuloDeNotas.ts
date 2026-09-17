import { mostrarAbaDeNotas } from "../notas-da-tela";
import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

/**
 * A conta tem o módulo de notas fiscais ligado?
 *
 * Quem responde é o `/user/me/`, que carrega a flag da empresa. Antes a tela
 * adivinhava: chamava uma rota do próprio módulo e lia a recusa como "não
 * tem". Adivinhar custava caro. Um 500 momentâneo ou o backend reiniciando
 * ficavam indistinguíveis de "sem módulo" — o cliente HTTP não preserva o
 * status — e o cliente pagante perdia a aba num soluço de rede, sem uma
 * palavra. A sonda ainda rodava em TODA carga de painel, porque a barra
 * superior está no layout, e batia num caminho de ESCRITA no servidor (a
 * semeadura do plano de contas) só para responder uma pergunta de leitura.
 */
export const useModuloDeNotas = () => {
  const usuario = useUsuarioAtual();

  // `falhou` importa tanto quanto a resposta em si: `/user/me/` não renova o
  // token (está na lista de rotas que não podem disparar refresh), então um
  // token vencido numa aba antiga volta como erro — e sumir com a aba aí seria
  // dizer ao cliente pagante que ele não tem o módulo que comprou.
  return {
    ativo: mostrarAbaDeNotas({
      usuario: usuario.data,
      carregando: usuario.isPending,
      falhou: usuario.isError,
    }),
  };
};
