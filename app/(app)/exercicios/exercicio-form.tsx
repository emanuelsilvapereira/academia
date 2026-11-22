"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { GRUPO_ROTULO } from "@/lib/format";
import type { FormState } from "@/lib/form";
import { MUSCULOS } from "@/lib/musculos";

export type InicialExercicio = {
  nome: string;
  grupo: string;
  equipamento: string;
  descricao: string;
  execucao: string;
  dicas: string;
  musculos_primarios: string;
  musculos_secundarios: string;
  video_url: string;
};


function Musculos({ nome, marcados, legenda }: { nome: string; marcados: string; legenda: string }) {
  const lista = new Set(marcados.split(",").filter(Boolean));
  return (
    <fieldset className="grupo-campos">
      <legend>{legenda}</legend>
      <div className="checks">
        {Object.entries(MUSCULOS).map(([id, m]) => (
          <label key={id} className="check" title={m.nome}>
            <input type="checkbox" name={nome} value={id} defaultChecked={lista.has(id)} /> {m.regiao}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ExercicioForm({
  acao,
  inicial,
  voltar = "/exercicios",
}: {
  acao: (e: FormState, d: FormData) => Promise<FormState>;
  inicial: InicialExercicio;
  voltar?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (c: keyof InicialExercicio) => estado?.valores?.[c] ?? inicial[c];

  return (
    // key: quando o servidor devolve erro, remonta o formulário com os valores enviados (checkboxes incluídos).
    <form key={JSON.stringify(estado?.valores ?? {})} action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="nome" rotulo="Nome" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={60} autoComplete="off" defaultValue={v("nome")} aria-invalid={erros.nome ? true : undefined} />
      </Campo>
      <div className="form-row">
        <Campo id="grupo" rotulo="Grupo muscular" erro={erros.grupo}>
          <select id="grupo" name="grupo" defaultValue={v("grupo")} aria-invalid={erros.grupo ? true : undefined}>
            {Object.entries(GRUPO_ROTULO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="equipamento" rotulo="Equipamento" erro={erros.equipamento}>
          <input id="equipamento" name="equipamento" maxLength={40} placeholder="Ex.: Halteres" autoComplete="off" defaultValue={v("equipamento")} aria-invalid={erros.equipamento ? true : undefined} />
        </Campo>
      </div>

      <Campo id="video_url" rotulo="Vídeo da execução (opcional)" erro={erros.video_url}>
        <input
          id="video_url"
          name="video_url"
          type="url"
          maxLength={300}
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={v("video_url")}
          aria-invalid={erros.video_url ? true : undefined}
          aria-describedby="video-ajuda"
        />
      </Campo>
      <p id="video-ajuda" className="hint" style={{ marginTop: -8, marginBottom: 16 }}>
        Cole o link de um vídeo do YouTube (normal, youtu.be ou Shorts) ou de um arquivo .mp4. Ele aparece para o aluno na página do exercício.
      </p>

      <Campo id="descricao" rotulo="O que o exercício trabalha (resumo)" erro={erros.descricao}>
        <textarea id="descricao" name="descricao" rows={2} maxLength={400} defaultValue={v("descricao")} aria-invalid={erros.descricao ? true : undefined} />
      </Campo>
      <Campo id="execucao" rotulo="Como fazer (um passo por linha)" erro={erros.execucao}>
        <textarea id="execucao" name="execucao" rows={5} maxLength={1200} defaultValue={v("execucao")} aria-invalid={erros.execucao ? true : undefined} />
      </Campo>
      <Campo id="dicas" rotulo="Dicas e erros comuns (um por linha)" erro={erros.dicas}>
        <textarea id="dicas" name="dicas" rows={3} maxLength={600} defaultValue={v("dicas")} aria-invalid={erros.dicas ? true : undefined} />
      </Campo>

      <Musculos nome="musculos_primarios" marcados={v("musculos_primarios")} legenda="Músculos principais" />
      <Musculos nome="musculos_secundarios" marcados={v("musculos_secundarios")} legenda="Músculos auxiliares" />

      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href={voltar} className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
