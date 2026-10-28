/**
 * A marca do FechaCaixa: o cupom com o check, do kit de marca.
 *
 * E o mesmo desenho de tres lugares — o icone da aba e o do app instalado no
 * celular (os dois em public/icones/) e as telas. Um desenho so,
 * para quem instala o app na loja reconhecer o mesmo simbolo no login.
 *
 * Duas formas, as mesmas do kit:
 * - "app": o simbolo branco sobre o quadrado verde arredondado. O fundo faz
 *   parte do simbolo (nao e um wrapper): e assim que ele aparece na tela
 *   inicial do celular. Vai no login, onde a marca e o assunto da tela.
 * - "simbolo": so o cupom, verde, sem fundo. Vai ao lado do nome na topbar,
 *   onde um quadrado cheio pesaria mais que o proprio nome.
 *
 * O desenho e a versao "pequeno" do kit: tracos mais grossos, feita para
 * continuar legivel abaixo de 32px.
 */
const CUPOM =
  "M62 82H194V202L172 224L150 202L128 224L106 202L84 224L62 202V82ZM46 28H210C221.05 28 230 36.95 230 48C230 59.05 221.05 68 210 68H46C34.95 68 26 59.05 26 48C26 36.95 34.95 28 46 28ZM91.71 128.09C85.47 121.84 75.33 121.84 69.09 128.09C62.84 134.33 62.84 144.47 69.09 150.71L101.29 182.91C107.53 189.16 117.67 189.16 123.91 182.91L188.31 118.51C194.56 112.27 194.56 102.13 188.31 95.89C182.07 89.64 171.93 89.64 165.69 95.89L112.6 148.97L91.71 128.09Z";

const VERDE_DA_MARCA = "#0B7A55";

export function MarcaFechaCaixa({
  className = "",
  forma = "app",
}: {
  className?: string;
  forma?: "app" | "simbolo";
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      role="img"
      aria-label="FechaCaixa"
      className={className}
    >
      {forma === "app" ? (
        <>
          <rect width="256" height="256" rx="57.6" fill={VERDE_DA_MARCA} />
          <path
            transform="translate(18.82 20.52) scale(0.853)"
            fill="#ffffff"
            fillRule="evenodd"
            d={CUPOM}
          />
        </>
      ) : (
        <path fill={VERDE_DA_MARCA} fillRule="evenodd" d={CUPOM} />
      )}
    </svg>
  );
}

export default MarcaFechaCaixa;
