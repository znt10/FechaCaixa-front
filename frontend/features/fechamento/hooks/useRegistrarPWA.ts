import { useEffect } from "react";

/**
 * Registra o service worker — so nas telas do formulario.
 *
 * Hook, e nao componente, porque as duas paginas do formulario tem varios
 * `return` (carregando, sem codigo, formulario): um componente teria que ser
 * repetido em cada ramo, e um deles ia ficar de fora numa mudanca futura.
 *
 * O painel da gerencia nao registra nada: ele e usado no computador, com
 * login, e nao ha o que instalar.
 *
 * O arquivo mora na raiz (/sw.js) apesar disso: o escopo de um worker e a
 * pasta dele, e o app anda por /fechamento e /<empresa>. Um worker em
 * /fechamento/sw.js nao alcancaria /primavera, e o navegador recusaria
 * instalar porque o start_url ficaria fora do escopo.
 */
export const useRegistrarPWA = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Falha silenciosa e o certo: sem service worker o formulario funciona
    // igual, so nao da para instalar. Nao ha o que dizer a quem esta lancando
    // o caixa as 22h.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
};
