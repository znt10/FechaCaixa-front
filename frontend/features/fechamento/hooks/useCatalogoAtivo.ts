import { usaCatalogo } from "@/features/fechamento/formulario-da-empresa";
import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

/**
 * A empresa usa catálogo de itens? (aba Catálogo, filtro Desperdício.)
 *
 * Mesma fonte e mesmo desenho do `useModuloDeNotas`: o `/user/me/`, que já é
 * carregado em toda abertura do painel, e a regra de três estados em
 * `usaCatalogo` — inclusive a de manter o catálogo quando a resposta falha.
 */
export const useCatalogoAtivo = () => {
  const usuario = useUsuarioAtual();

  return usaCatalogo({
    usuario: usuario.data,
    carregando: usuario.isPending,
    falhou: usuario.isError,
  });
};
