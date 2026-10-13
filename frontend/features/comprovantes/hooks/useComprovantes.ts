import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

import { mostrarAreaDeComprovantes } from "../comprovantes-da-tela";

export const useAreaDeComprovantes = () => {
  const usuario = useUsuarioAtual();
  return {
    ativo: mostrarAreaDeComprovantes({
      usuario: usuario.data,
      carregando: usuario.isPending,
      falhou: usuario.isError,
    }),
  };
};
