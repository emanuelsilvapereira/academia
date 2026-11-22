"use client";

import { useActionState, useEffect, useRef } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import { InputMascara } from "@/components/input-mascara";
import { criarAviso } from "./actions";

export function AvisoForm() {
  const [estado, executar, pendente] = useActionState(criarAviso, undefined);
  const form = useRef<HTMLFormElement>(null);
  const { avisar } = useAvisos();
  const erros = estado?.erros ?? {};
  const v = (c: string) => (estado?.ok ? "" : (estado?.valores?.[c] ?? ""));
  useEffect(() => {
    if (estado?.ok && estado.mensagem) {
      avisar({ texto: estado.mensagem });
      form.current?.reset();
    }
  }, [estado, avisar]);

  return (
    <form ref={form} action={executar} noValidate>
      <Campo id="titulo" rotulo="Título" erro={erros.titulo}>
        <input id="titulo" name="titulo" maxLength={80} placeholder="Ex.: Horário especial no feriado" defaultValue={v("titulo")} aria-invalid={erros.titulo ? true : undefined} />
      </Campo>
      <Campo id="texto" rotulo="Mensagem" erro={erros.texto}>
        <textarea id="texto" name="texto" rows={3} maxLength={600} defaultValue={v("texto")} aria-invalid={erros.texto ? true : undefined} />
      </Campo>
      <div className="form-row">
        <Campo id="expira_em" rotulo="Mostrar até (opcional)" erro={erros.expira_em}>
          <InputMascara id="expira_em" name="expira_em" mascara="data" defaultValue={v("expira_em")} />
        </Campo>
        <label className="check" style={{ alignSelf: "center" }}>
          <input type="checkbox" name="fixado" defaultChecked={v("fixado") === "on"} />
          <span>Fixar no topo</span>
        </label>
      </div>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Publicando…" : "Publicar aviso"}
      </button>
    </form>
  );
}
