import type { MetadataRoute } from "next";

/**
 * O formulario instalado como app no celular da loja.
 *
 * start_url e /fechamento, e nao /primavera, porque o manifest e um arquivo so
 * para todas as empresas — nao da para gravar o apelido de uma nela. E nem
 * precisa: /fechamento ja manda o aparelho para a empresa dele quando o codigo
 * ja foi digitado, e oferece as duas portas (formulario e painel) quando nao
 * foi. O mesmo icone serve para a Primavera e para a proxima empresa.
 *
 * scope "/" porque o app anda por tres enderecos (/fechamento, /<empresa> e o
 * painel, a partir do /login) — escopo menor faria o celular abrir o navegador
 * ao trocar de um para o outro, saindo da janela do app. E o que deixa a
 * gerencia usar o painel dentro do app instalado, sem barra de endereco.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fechamento de Caixa",
    // Cabe embaixo do icone na tela inicial sem virar reticencias.
    short_name: "Caixa",
    description:
      "Lançamento do fechamento de caixa da loja: vendas, saídas e retiradas.",
    start_url: "/fechamento",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    // A cor da barra do sistema quando o app esta aberto, e a cor da tela
    // enquanto ele carrega — as duas da paleta do fechamento, para a abertura
    // nao piscar branco.
    theme_color: "#14624a",
    background_color: "#e6ece7",
    icons: [
      {
        src: "/icones/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icones/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icones/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
