import { MENSAGEM_EMPRESA_DESATIVADA } from "../mensalidade-da-tela";

/** A mesma tela no painel e no formulário da loja. */
export function EmpresaDesativada() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-[16px]">
      <div className="max-w-[440px] text-center">
        <h1 className="text-[20px] font-bold">Empresa desativada</h1>
        <p className="mt-[8px] text-[15px] leading-[1.5] text-caixa-muted">
          {MENSAGEM_EMPRESA_DESATIVADA}
        </p>
      </div>
    </div>
  );
}
