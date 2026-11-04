import { TelaDeComprovantes } from "@/features/comprovantes/components/TelaDeComprovantes";

/** Comprovantes CPF: o gasto pessoal, mandado para a caixa própria. Nunca soma
 *  nas lojas. */
export default function ComprovantesPessoaisPage() {
  return <TelaDeComprovantes pessoal />;
}
