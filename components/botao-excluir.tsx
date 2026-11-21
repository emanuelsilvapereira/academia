"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ResultadoAcao, ResultadoExclusao } from "@/lib/form";
import { useAvisos } from "./avisos";

type Props = {
  acao: () => Promise<ResultadoExclusao | ResultadoAcao>;
  rotulo: string;
  /** Se informado, abre um diálogo de confirmação antes de executar. */
  confirmacao?: { titulo: string; texto: string; botao: string };
  perigo?: boolean;
  classe?: string;
  /** Página para onde ir depois que der certo (ex.: voltar para a lista após excluir). */
  depois?: string;
};

// Botão que chama uma Server Action. Com `confirmacao`, pergunta antes num diálogo próprio
// (não usa o window.confirm do navegador). O resultado aparece num aviso, com "Desfazer" quando houver.
export function BotaoAcao({ acao, rotulo, confirmacao, perigo = false, classe = "btn sm", depois }: Props) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const { avisar } = useAvisos();

  function executar() {
    setErro("");
    iniciar(async () => {
      const r = await acao();
      dialogo.current?.close();
      if (r.ok) {
        avisar({ texto: r.mensagem, desfazer: "desfazer" in r ? r.desfazer : undefined });
        if (depois) router.push(depois);
      } else setErro(r.mensagem);
    });
  }

  return (
    <>
      <button
        type="button"
        className={`${classe}${perigo ? " danger" : ""}`}
        disabled={pendente}
        onClick={() => (confirmacao ? dialogo.current?.showModal() : executar())}
      >
        {pendente && !confirmacao ? "…" : rotulo}
      </button>
      {erro ? (
        <span className="err" role="alert">
          {erro}
        </span>
      ) : null}

      {confirmacao ? (
        <dialog ref={dialogo} className="dialogo" aria-label={confirmacao.titulo}>
          <h2>{confirmacao.titulo}</h2>
          <p>{confirmacao.texto}</p>
          <div className="dlg-actions">
            <button type="button" className="btn primary" onClick={executar} disabled={pendente} autoFocus>
              {pendente ? "Aguarde…" : confirmacao.botao}
            </button>
            <button type="button" className="btn" onClick={() => dialogo.current?.close()} disabled={pendente}>
              Cancelar
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}

/** Atalho para o caso mais comum: excluir com confirmação e "Desfazer". */
export function BotaoExcluir({
  acao,
  nome,
  detalhe,
  rotulo = "Excluir",
  depois,
}: {
  acao: () => Promise<ResultadoExclusao>;
  nome: string;
  detalhe?: string;
  rotulo?: string;
  depois?: string;
}) {
  return (
    <BotaoAcao
      acao={acao}
      rotulo={rotulo}
      perigo
      depois={depois}
      confirmacao={{
        titulo: `Excluir ${nome}?`,
        texto: `${detalhe ? `${detalhe} ` : ""}Você poderá desfazer logo depois, pelo aviso que aparece no canto da tela.`,
        botao: "Excluir",
      }}
    />
  );
}
