"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { desfazerExclusao } from "@/app/(app)/lixeira-actions";

// Avisos rápidos no canto da tela ("Aluno excluído. Desfazer"). Ficam no layout, então continuam
// aparecendo mesmo depois que a linha excluída some da tabela.

type Aviso = { id: number; texto: string; desfazer?: number; erro?: boolean };
type Contexto = { avisar: (a: Omit<Aviso, "id">) => void };

const AvisosContexto = createContext<Contexto>({ avisar: () => {} });

const DURACAO_MS = 12000;

export function useAvisos(): Contexto {
  return useContext(AvisosContexto);
}

function ItemAviso({ aviso, fechar }: { aviso: Aviso; fechar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState(aviso.texto);
  const [desfeito, setDesfeito] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(fechar, DURACAO_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fechar]);

  function desfazer() {
    if (!aviso.desfazer) return;
    if (timer.current) clearTimeout(timer.current);
    iniciar(async () => {
      const r = await desfazerExclusao(aviso.desfazer!);
      setTexto(r.mensagem);
      setDesfeito(true);
      timer.current = setTimeout(fechar, 3500);
    });
  }

  return (
    <div className={`aviso${aviso.erro ? " aviso-erro" : ""}`} role={aviso.erro ? "alert" : "status"}>
      <span>{texto}</span>
      {aviso.desfazer && !desfeito ? (
        <button type="button" className="aviso-btn" onClick={desfazer} disabled={pendente}>
          {pendente ? "Desfazendo…" : "Desfazer"}
        </button>
      ) : null}
      <button type="button" className="aviso-x" onClick={fechar} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

export function Avisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(1);

  const avisar = useCallback((a: Omit<Aviso, "id">) => {
    const id = proximo.current++;
    setAvisos((lista) => [...lista.slice(-2), { ...a, id }]);
  }, []);

  const fechar = useCallback((id: number) => setAvisos((lista) => lista.filter((x) => x.id !== id)), []);

  return (
    <AvisosContexto.Provider value={{ avisar }}>
      {children}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => (
          <ItemAviso key={a.id} aviso={a} fechar={() => fechar(a.id)} />
        ))}
      </div>
    </AvisosContexto.Provider>
  );
}
