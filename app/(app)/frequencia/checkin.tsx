"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useAvisos } from "@/components/avisos";
import { SITUACAO_ROTULO } from "@/lib/format";
import { registrarEntrada, type ResultadoCheckin } from "./actions";

type Achado = { id: number; nome: string; codigo: string; situacao: string; plano_nome: string | null; ja_entrou: number };

const CODIGO_RE = /^PUL-[A-Z0-9]{6}$/i;

// Interface mínima do BarcodeDetector (API do navegador; ainda não está nos tipos padrão do TypeScript).
type Detector = { detect: (fonte: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstrutor = new (opcoes: { formats: string[] }) => Detector;

/**
 * Check-in rápido: digite parte do nome (ou o código) e aperte Enter.
 * Um leitor de QR code USB funciona como teclado: lê a carteirinha, "digita" o código e aperta Enter sozinho.
 * Em navegadores com BarcodeDetector (Chrome no Android/Mac, Edge...), dá para usar a câmera.
 */
export function Checkin() {
  const [q, setQ] = useState("");
  const [encontrados, setAchados] = useState<Achado[]>([]);
  const [sel, setSel] = useState(0);
  const [resultado, setResultado] = useState<ResultadoCheckin | null>(null);
  const [pendente, iniciar] = useTransition();
  const [camera, setCamera] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const { avisar } = useAvisos();

  // Só existe no navegador; no servidor a resposta é "não" (evita diferença na hidratação).
  const temCamera = useSyncExternalStore(
    () => () => {},
    () => "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
  const termo = q.trim();
  const buscando = termo.length >= 2 && !CODIGO_RE.test(termo);
  const achados = buscando ? encontrados : [];

  // Busca com um pequeno atraso para não consultar a cada tecla.
  useEffect(() => {
    if (!buscando) return;
    const controle = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/alunos/busca?q=${encodeURIComponent(termo)}`, { signal: controle.signal });
        if (!r.ok) return;
        const dados = (await r.json()) as { alunos: Achado[] };
        setAchados(dados.alunos);
        setSel(0);
      } catch {
        /* busca cancelada */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      controle.abort();
    };
  }, [termo, buscando]);

  function registrar(alvo: { alunoId?: number; codigo?: string }) {
    iniciar(async () => {
      const r = await registrarEntrada(alvo);
      setResultado(r);
      if (r.ok) {
        avisar({ texto: r.mensagem });
        setQ("");
        setAchados([]);
      }
      campo.current?.focus();
    });
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, achados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Escape") {
      setQ("");
      setAchados([]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (CODIGO_RE.test(termo)) registrar({ codigo: termo });
      else if (achados[sel]) registrar({ alunoId: achados[sel].id });
      else if (termo.length >= 2) setResultado({ ok: false, mensagem: "Nenhum aluno encontrado com esse nome ou código." });
    }
  }

  // Leitura pela câmera.
  useEffect(() => {
    if (!camera) return;
    let parar = false;
    let stream: MediaStream | null = null;
    let ultimo = "";
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current || parar) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Construtor = (window as unknown as { BarcodeDetector: DetectorConstrutor }).BarcodeDetector;
        const detector = new Construtor({ formats: ["qr_code"] });
        while (!parar) {
          const codigos = await detector.detect(video.current).catch(() => []);
          const lido = codigos[0]?.rawValue?.trim();
          if (lido && lido !== ultimo && CODIGO_RE.test(lido)) {
            ultimo = lido;
            registrar({ codigo: lido });
          }
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch {
        setResultado({ ok: false, mensagem: "Não foi possível abrir a câmera. Verifique a permissão do navegador." });
        setCamera(false);
      }
    })();
    return () => {
      parar = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // registrar muda a cada render, mas só precisamos reiniciar quando a câmera liga/desliga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <div className="checkin">
      <label htmlFor="checkin-busca">Nome, código da carteirinha ou CPF</label>
      <div className="checkin-campo">
        <input
          ref={campo}
          id="checkin-busca"
          type="search"
          autoFocus
          autoComplete="off"
          placeholder="Comece a digitar e aperte Enter"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setResultado(null);
          }}
          onKeyDown={aoTeclar}
          role="combobox"
          aria-expanded={achados.length > 0}
          aria-controls="checkin-lista"
          aria-activedescendant={achados[sel] ? `checkin-op-${achados[sel].id}` : undefined}
          disabled={pendente}
        />
        {achados.length > 0 ? (
          <ul id="checkin-lista" className="checkin-lista" role="listbox">
            {achados.map((a, i) => {
              const bloqueado = a.situacao === "inativo" || a.situacao === "vencido" || !!a.ja_entrou;
              return (
                <li
                  key={a.id}
                  id={`checkin-op-${a.id}`}
                  role="option"
                  aria-selected={i === sel}
                  className={bloqueado ? "bloqueado" : undefined}
                  onMouseEnter={() => setSel(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    registrar({ alunoId: a.id });
                  }}
                >
                  <span className="name">{a.nome}</span>
                  <span className="sub">
                    {a.codigo} · {a.plano_nome ?? "sem plano"} ·{" "}
                    {a.ja_entrou ? "já entrou hoje" : (SITUACAO_ROTULO[a.situacao] ?? a.situacao)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {resultado ? (
        <p className={resultado.ok ? "ok" : "alert"} role={resultado.ok ? "status" : "alert"}>
          {resultado.mensagem}
          {resultado.aviso ? (
            <>
              <br />
              <strong>{resultado.aviso}</strong>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="row" style={{ marginTop: 14 }}>
        {temCamera ? (
          <button type="button" className="btn sm" onClick={() => setCamera((c) => !c)}>
            {camera ? "Fechar câmera" : "Ler QR code pela câmera"}
          </button>
        ) : (
          <span className="hint" style={{ marginTop: 0 }}>
            Leitor de QR code USB: clique no campo e passe a carteirinha.
          </span>
        )}
      </div>
      {camera ? <video ref={video} className="camera" muted playsInline /> : null}
    </div>
  );
}
