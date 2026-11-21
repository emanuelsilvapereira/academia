import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { PERFIL_ROTULO } from "@/lib/permissoes";

export default async function SemPermissaoPage() {
  const usuario = await exigirUsuario();
  return (
    <>
      <Cabecalho titulo="Sem permissão" />
      <div className="panel form-page">
        <p>
          O seu perfil (<strong>{PERFIL_ROTULO[usuario.perfil]}</strong>) não pode abrir essa página ou fazer essa
          operação. Se precisar, peça a um administrador.
        </p>
        <div className="dlg-actions">
          <Link href="/painel" className="btn primary">
            Voltar ao painel
          </Link>
        </div>
      </div>
    </>
  );
}
