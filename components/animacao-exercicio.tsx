"use client";

import { useState } from "react";

// Animação do exercício: um GIF (gerado com o ffmpeg a partir das duas fotos) que troca a posição
// inicial pela final, em repetição e sem som. "Pausar" mostra a foto parada.
// Quem prefere menos movimento (configuração do sistema) vê as duas fotos paradas, lado a lado.
// Fotos: Free Exercise DB (domínio público).

const arquivo = (pasta: string, nome: string) => `/exercicios/${pasta}/${nome}`;

export function AnimacaoExercicio({ pasta, nome }: { pasta: string; nome: string }) {
  const [pausado, setPausado] = useState(false);
  return (
    <figure className={`animacao${pausado ? " pausada" : ""}`}>
      {/* eslint-disable @next/next/no-img-element -- GIF e fotos estáticas: a otimização do Next tiraria a animação */}
      <img
        src={arquivo(pasta, pausado ? "0.jpg" : "animacao.gif")}
        alt={`${nome}: animação da posição inicial para a final`}
        width={480}
        height={320}
        className="animacao-gif"
      />
      <div className="animacao-estatica" aria-hidden="true">
        <img src={arquivo(pasta, "0.jpg")} alt="" width={850} height={567} />
        <img src={arquivo(pasta, "1.jpg")} alt="" width={850} height={567} />
      </div>
      {/* eslint-enable @next/next/no-img-element */}
      <figcaption>
        <span className="muted small">Posição inicial ↔ final</span>
        <button type="button" className="btn sm" onClick={() => setPausado((p) => !p)} aria-pressed={pausado}>
          {pausado ? "Animar" : "Pausar"}
        </button>
      </figcaption>
    </figure>
  );
}

/** Miniatura (primeira foto) para listas e cartões. */
export function MiniaturaExercicio({ pasta }: { pasta: string }) {
  if (!pasta) return <span className="miniatura miniatura-vazia" aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={arquivo(pasta, "0.jpg")} alt="" className="miniatura" width={96} height={64} loading="lazy" />;
}
