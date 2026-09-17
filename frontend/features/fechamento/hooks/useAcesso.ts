import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  entrarComCodigo,
  getEmpresaDoFormulario,
  sairDoFormulario,
} from "../services/acesso";

/**
 * Quem e a empresa deste aparelho — e, de quebra, o teste de acesso.
 *
 * Erro aqui quer dizer "sem token" (ou token revogado pelo painel), e e o que
 * manda a pagina cair na tela do codigo. `retry: false` de proposito: repetir
 * um 401 tres vezes so atrasa a tela que o funcionario precisa ver.
 */
export const useEmpresaDoFormulario = () =>
  useQuery({
    queryKey: ["fechamento", "empresa"],
    queryFn: getEmpresaDoFormulario,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

export const useEntrarComCodigo = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: entrarComCodigo,
    // O cookie novo muda quem esta falando: lojas, responsaveis e turnos da
    // empresa anterior nao valem mais nada neste aparelho.
    onSuccess: (empresa) => {
      cliente.setQueryData(["fechamento", "empresa"], empresa);
      cliente.invalidateQueries({ queryKey: ["fechamento"] });
    },
  });
};

export const useSairDoFormulario = () => {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: sairDoFormulario,
    onSuccess: () => cliente.clear(),
  });
};
