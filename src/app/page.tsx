"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { TrackInput, VideoCandidate } from "@/lib/music";

type AccessState = {
  configured: boolean;
  authenticated: boolean;
  spotifyConfigured: boolean;
  youtubeConfigured: boolean;
  spotifyConnected: boolean;
  youtubeConnected: boolean;
};

type ImportedPlaylist = {
  id: string;
  name: string;
  description: string;
  cover: string | null;
  total: number;
  nextOffset: number | null;
};

type TransferTrack = TrackInput & {
  key: string;
  selected: boolean;
  candidates: VideoCandidate[];
  videoId: string;
  searched: boolean;
  matching: boolean;
  added: boolean;
  error: string;
};

type Notice = { kind: "success" | "error" | "info"; text: string };

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

async function responseJson<T>(response: Response): Promise<T & { error?: string }> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(result.error ?? "Algo não deu certo. Tente novamente.", result.code);
  return result;
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === "lock") return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>;
  if (name === "link") return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>;
  if (name === "music") return <svg {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
  if (name === "disc") return <svg {...common}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7m9 2h-7m-2 9v-7M3 12h7"/></svg>;
  if (name === "upload") return <svg {...common}><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>;
  if (name === "external") return <svg {...common}><path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.9-2L20 12M4 12l2.5 5a7 7 0 0 0 11.9-2"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>;
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /><span /></div>;
}

function AccessGate({ configured, onLogin }: { configured: boolean; onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    setDeployed(!["localhost", "127.0.0.1"].includes(window.location.hostname));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await onLogin(password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  return (
    <main className="gate-shell">
      <div className="gate-glow" />
      <header className="gate-brand"><BrandMark /><span>mudasom</span><span className="beta-chip">USO PESSOAL</span></header>
      <section className="gate-card">
        <div className="eyebrow"><Icon name="lock" size={15} /> COFRE PARTICULAR</div>
        <h1>Sua música.<br /><em>Seu espaço.</em></h1>
        <p>Um lugar privado para levar suas playlists de um serviço para outro, com cada faixa revisada por você.</p>
        {!configured ? (
          <div className="setup-note"><strong>Falta proteger este espaço.</strong><span>{deployed ? <>Defina <code>APP_PASSWORD</code> (16+ caracteres) e <code>APP_SESSION_SECRET</code> (32+) nas variáveis do projeto Vercel e faça redeploy.</> : <>Defina <code>APP_PASSWORD</code> (16+ caracteres) e <code>APP_SESSION_SECRET</code> (32+) no arquivo <code>.env.local</code>.</>}</span></div>
        ) : (
          <form onSubmit={submit} className="gate-form">
            <label htmlFor="app-password">Senha do seu espaço</label>
            <div className="gate-input-row"><input id="app-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" required /><button className="round-arrow" aria-label="Entrar" disabled={busy}><Icon name="arrow" /></button></div>
            {error && <div className="inline-error">{error}</div>}
            <span className="micro-copy">A senha fica em uma variável privada da Vercel.</span>
          </form>
        )}
      </section>
      <div className="gate-bottom"><span>FEITO PARA SUA BIBLIOTECA, NÃO PARA UM FEED.</span><span>01 / PRIVADO</span></div>
    </main>
  );
}

export default function Home() {
  const [access, setAccess] = useState<AccessState | null>(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [playlist, setPlaylist] = useState<ImportedPlaylist | null>(null);
  const [tracks, setTracks] = useState<TransferTrack[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [destinationPlaylistId, setDestinationPlaylistId] = useState("");
  const [jobState, setJobState] = useState<"idle" | "matching" | "creating" | "adding" | "done">("idle");
  const [jobProgress, setJobProgress] = useState({ current: 0, total: 0 });
  const [resultUrl, setResultUrl] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  const refreshAccess = useCallback(async () => {
    try {
      const result = await responseJson<AccessState>(await fetch("/api/access/status", { cache: "no-store" }));
      setAccess(result);
    } catch {
      setNotice({ kind: "error", text: "Não consegui consultar o estado da sessão." });
    } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    void refreshAccess();
    const query = new URLSearchParams(window.location.search);
    const connected = query.get("connected");
    const error = query.get("error");
    if (connected === "spotify") setNotice({ kind: "success", text: "Spotify conectado. Agora escolha uma playlist." });
    if (connected === "youtube") setNotice({ kind: "success", text: "YouTube conectado. As novas playlists serão privadas." });
    const errors: Record<string, string> = {
      "spotify-config": "Faltam as credenciais do Spotify no ambiente.",
      "youtube-config": "Faltam as credenciais do Google no ambiente.",
      "spotify-state": "A conexão com o Spotify expirou. Tente novamente.",
      "youtube-state": "A conexão com o YouTube expirou. Tente novamente.",
      "spotify-token": "O Spotify não concluiu a autorização. Confira o callback cadastrado.",
      "youtube-token": "O Google não concluiu a autorização. Confira o callback cadastrado.",
      "youtube-refresh": "O Google não retornou acesso offline. Reconecte e aceite as permissões.",
      "auth-required": "Entre com sua senha antes de conectar uma plataforma.",
    };
    if (error && errors[error]) setNotice({ kind: "error", text: errors[error] });
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);
  }, [refreshAccess]);

  useEffect(() => {
    if (!access?.authenticated || draftReady) return;
    try {
      const raw = window.localStorage.getItem("mudasom-transfer-draft-v1");
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.version === 1 && draft.playlist && Array.isArray(draft.tracks) && typeof draft.playlist.id === "string") {
          setPlaylist(draft.playlist as ImportedPlaylist);
          setTracks(draft.tracks as TransferTrack[]);
          setSourceUrl(typeof draft.sourceUrl === "string" ? draft.sourceUrl : draft.playlist.id);
          setDestinationPlaylistId(typeof draft.destinationPlaylistId === "string" ? draft.destinationPlaylistId : "");
          setResultUrl(typeof draft.resultUrl === "string" ? draft.resultUrl : "");
        }
      }
    } catch {
      window.localStorage.removeItem("mudasom-transfer-draft-v1");
    }
    setDraftReady(true);
  }, [access?.authenticated, draftReady]);

  useEffect(() => {
    if (!access?.authenticated || !draftReady) return;
    const timeout = window.setTimeout(() => {
      if (playlist && tracks.length) {
        try {
          window.localStorage.setItem("mudasom-transfer-draft-v1", JSON.stringify({
            version: 1, sourceUrl, playlist, tracks, destinationPlaylistId, resultUrl,
          }));
        } catch { /* The current tab can continue even if browser storage is full. */ }
      } else {
        window.localStorage.removeItem("mudasom-transfer-draft-v1");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [access?.authenticated, draftReady, destinationPlaylistId, playlist, resultUrl, sourceUrl, tracks]);

  const selectedCount = useMemo(() => tracks.filter((track) => track.selected).length, [tracks]);
  const searchableCount = useMemo(() => tracks.filter((track) => track.selected && !track.searched).length, [tracks]);
  const readyCount = useMemo(() => tracks.filter((track) => track.selected && track.videoId).length, [tracks]);
  const remainingCount = useMemo(() => tracks.filter((track) => track.selected && track.videoId && !track.added).length, [tracks]);
  const addedCount = useMemo(() => tracks.filter((track) => track.added).length, [tracks]);
  const transferComplete = Boolean(destinationPlaylistId && readyCount > 0 && remainingCount === 0 && searchableCount === 0);
  const currentStep = !access?.spotifyConnected ? 1 : !playlist ? 2 : transferComplete || jobState === "done" ? 4 : 3;

  async function login(password: string) {
    const result = await responseJson<{ authenticated: boolean }>(await fetch("/api/access/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    }));
    if (!result.authenticated) throw new Error("Não foi possível iniciar a sessão.");
    await refreshAccess();
  }

  async function logout() {
    await fetch("/api/access/logout", { method: "POST" });
    window.localStorage.removeItem("mudasom-transfer-draft-v1");
    setTracks([]); setPlaylist(null); setResultUrl(""); setDestinationPlaylistId(""); setJobState("idle"); setDraftReady(false);
    await refreshAccess();
  }

  async function disconnect(provider: "spotify" | "youtube") {
    await fetch(`/api/auth/${provider}/disconnect`, { method: "POST" });
    await refreshAccess();
    setNotice({ kind: "info", text: `${provider === "spotify" ? "Spotify" : "YouTube"} desconectado.` });
  }

  async function importPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (playlist && (destinationPlaylistId || tracks.some((track) => track.searched || track.added)) && !window.confirm("Há progresso salvo nesta playlist. Trocar agora vai descartar o rascunho local.")) return;
    setLoadingSource(true); setNotice(null); setPlaylist(null); setTracks([]); setResultUrl(""); setDestinationPlaylistId(""); setJobState("idle");
    try {
      const result = await responseJson<{ playlist: ImportedPlaylist; tracks: Array<TrackInput & { id: string }> }>(await fetch("/api/transfer/source", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlistUrl: sourceUrl, offset: 0 }),
      }));
      setPlaylist(result.playlist);
      setTracks(result.tracks.map((track, index) => ({
        ...track, key: `${track.id}-${index}`, selected: true, candidates: [], videoId: "", searched: false, matching: false, added: false, error: "",
      })));
      setNotice({ kind: "success", text: `${result.tracks.length} faixas carregadas de “${result.playlist.name}”.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível abrir essa playlist." });
    } finally { setLoadingSource(false); }
  }

  async function loadMoreTracks() {
    if (!playlist || playlist.nextOffset === null || loadingMore) return;
    const offset = playlist.nextOffset;
    setLoadingMore(true);
    setNotice(null);
    try {
      const result = await responseJson<{ playlist: ImportedPlaylist; tracks: Array<TrackInput & { id: string }> }>(await fetch("/api/transfer/source", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlistUrl: playlist.id, offset }),
      }));
      setTracks((current) => [...current, ...result.tracks.map((track, index) => ({
        ...track, key: `${track.id}-${current.length + index}`, selected: true, candidates: [], videoId: "", searched: false, matching: false, added: false, error: "",
      }))]);
      setPlaylist(result.playlist);
      setNotice({ kind: "success", text: `${result.tracks.length} faixas adicionais carregadas.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar o próximo lote." });
    } finally { setLoadingMore(false); }
  }

  function toggleTrack(key: string, selected: boolean) {
    setTracks((current) => current.map((track) => track.key === key ? { ...track, selected } : track));
  }

  async function matchTracks() {
    const selected = tracks.filter((track) => track.selected && !track.searched);
    if (selected.length === 0) {
      const anySelected = tracks.some((track) => track.selected);
      setNotice({ kind: "info", text: anySelected ? "As faixas selecionadas já foram pesquisadas nesta playlist. Revise as sugestões ou transfira as correspondências escolhidas." : "Selecione pelo menos uma faixa." });
      return;
    }
    if (!access?.youtubeConnected) { setNotice({ kind: "error", text: "Conecte sua conta do YouTube para encontrar as faixas." }); return; }
    setJobState("matching"); setJobProgress({ current: 0, total: selected.length }); setNotice({ kind: "info", text: "Pesquisando as faixas selecionadas. Se o YouTube atingir a cota, o restante fica pendente para retomar depois." });
    let failures = 0;
    let quotaReached = false;
    let accessFailed = "";
    let stoppedAfterFailures = false;
    for (let index = 0; index < selected.length; index += 1) {
      const track = selected[index];
      setTracks((current) => current.map((item) => item.key === track.key ? { ...item, matching: true, error: "" } : item));
      try {
        const result = await responseJson<{ candidates: VideoCandidate[] }>(await fetch("/api/transfer/match", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track: { name: track.name, artists: track.artists, album: track.album, durationMs: track.durationMs } }),
        }));
        const candidates = result.candidates ?? [];
        setTracks((current) => current.map((item) => item.key === track.key
          ? { ...item, candidates, videoId: candidates[0]?.id ?? "", searched: true, matching: false, error: candidates.length ? "" : "Nenhum resultado encontrado." }
          : item));
      } catch (error) {
        if (error instanceof ApiError && ["YOUTUBE_QUOTA", "YOUTUBE_API_DISABLED", "YOUTUBE_ACCESS"].includes(error.code ?? "")) {
          quotaReached = error.code === "YOUTUBE_QUOTA";
          accessFailed = quotaReached ? "" : error.message;
          setTracks((current) => current.map((item) => item.key === track.key
            ? { ...item, searched: false, matching: false, error: error.message }
            : item));
          break;
        }
        failures += 1;
        setTracks((current) => current.map((item) => item.key === track.key
          ? { ...item, searched: false, matching: false, error: error instanceof Error ? error.message : "Falha na busca." }
          : item));
        if (failures >= 3) { stoppedAfterFailures = true; break; }
      }
      setJobProgress({ current: index + 1, total: selected.length });
    }
    setJobState("idle");
    if (quotaReached) setNotice({ kind: "info", text: "A cota do YouTube acabou. As faixas que faltam continuam sem busca e podem ser retomadas quando a cota voltar." });
    else if (accessFailed) setNotice({ kind: "error", text: accessFailed });
    else if (stoppedAfterFailures) setNotice({ kind: "error", text: "Interrompi depois de três falhas para poupar chamadas. As faixas continuam pendentes e podem ser tentadas novamente." });
    else setNotice(failures
      ? { kind: "error", text: `${failures} buscas falharam. Revise os avisos em cada faixa antes de continuar.` }
      : { kind: "success", text: "Sugestões carregadas. Revise o resultado de cada faixa e escolha a versão correta." });
  }

  function chooseVideo(key: string, videoId: string) {
    setTracks((current) => current.map((track) => track.key === key ? { ...track, videoId } : track));
  }

  async function createPlaylist() {
    const chosen = tracks.filter((track) => track.selected && track.videoId && !track.added);
    if (!playlist || chosen.length === 0) { setNotice({ kind: "error", text: "Nenhuma faixa revisada está pronta para transferir." }); return; }
    setNotice(null); setJobState(destinationPlaylistId ? "adding" : "creating"); setJobProgress({ current: 0, total: chosen.length });
    let targetId = destinationPlaylistId;
    let targetUrl = resultUrl;
    try {
      if (!targetId) {
        const created = await responseJson<{ id: string; url: string }>(await fetch("/api/transfer/create", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: playlist.name }),
        }));
        targetId = created.id;
        targetUrl = created.url;
        setDestinationPlaylistId(targetId);
        setResultUrl(targetUrl);
        setJobState("adding");
      }
      for (let index = 0; index < chosen.length; index += 1) {
        const track = chosen[index];
        await responseJson<{ added: boolean }>(await fetch("/api/transfer/add", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: targetId, videoId: track.videoId }),
        }));
        setTracks((current) => current.map((item) => item.key === track.key ? { ...item, added: true, error: "" } : item));
        setJobProgress({ current: index + 1, total: chosen.length });
      }
      setJobState("done");
      setNotice({ kind: "success", text: `${chosen.length} faixas adicionadas. Sua nova playlist está privada.` });
    } catch (error) {
      setJobState("idle");
      setNotice({
        kind: error instanceof ApiError && error.code === "YOUTUBE_WRITE_QUOTA" ? "info" : "error",
        text: `${error instanceof Error ? error.message : "A transferência parou."}${targetUrl ? " O avanço foi salvo neste navegador e pode ser retomado na mesma playlist." : ""}`,
      });
    }
  }

  if (checking || !access) return <main className="loading-shell"><BrandMark /><span>abrindo seu espaço...</span></main>;
  if (!access.configured || !access.authenticated) return <AccessGate configured={access.configured} onLogin={login} />;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MudaSom início"><BrandMark /><span>mudasom</span><sup>beta</sup></a>
        <div className="topbar-right"><span className="private-indicator"><i /> ESPAÇO PRIVADO</span><button className="text-button" onClick={logout}>Sair</button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SUA BIBLIOTECA, EM MOVIMENTO</div>
          <h1>A música vai<br /><em>junto com você.</em></h1>
          <p>Leve uma playlist do Spotify para o YouTube Music sem refazer tudo na mão. Você confere cada faixa antes de criar a nova lista.</p>
          <div className="hero-meta"><span><Icon name="lock" size={16} /> PRIVADO POR PADRÃO</span><span>01 → 02 PLATAFORMAS</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustração de um disco atravessando entre dois serviços">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="record"><div className="record-ring ring-one" /><div className="record-ring ring-two" /><div className="record-ring ring-three" /><div className="record-center"><BrandMark /></div></div>
          <div className="service-bubble bubble-spotify"><span className="spotify-glyph">≋</span></div>
          <div className="service-bubble bubble-youtube"><span className="play-glyph">▶</span></div>
          <div className="art-label label-top">FAIXA A FAIXA</div><div className="art-label label-bottom">O SEU SOM, LEVADO ADIANTE</div>
        </div>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="workspace-heading">
          <div><div className="eyebrow muted-eyebrow">VAMOS LEVAR SUA MÚSICA</div><h2 id="workspace-title">Sua próxima mudança</h2></div>
          <span className="step-count">PASSO 0{currentStep} <i>/</i> 04</span>
        </div>
        <div className="step-rail" aria-label={`Etapa ${currentStep} de 4`}>
          {["Conecte", "Escolha", "Revise", "Leve"].map((label, index) => <div className={`step ${index + 1 < currentStep ? "step-complete" : index + 1 === currentStep ? "step-active" : ""}`} key={label}><span>{index + 1 < currentStep ? <Icon name="check" size={14} /> : `0${index + 1}`}</span><b>{label}</b></div>)}
        </div>

        <div className="connections">
          <div className="connection-block">
            <div className="connection-heading"><span className="connection-number">01</span><div><strong>De onde vem</strong><small>Conecte sua biblioteca de origem</small></div></div>
          <ConnectionCard provider="spotify" configured={access.spotifyConfigured} connected={access.spotifyConnected} onDisconnect={() => disconnect("spotify")} />
          </div>
          <div className="route-mark"><span /><Icon name="arrow" size={19} /><span /></div>
          <div className="connection-block">
            <div className="connection-heading"><span className="connection-number">02</span><div><strong>Para onde vai</strong><small>Escolha seu destino musical</small></div></div>
          <ConnectionCard provider="youtube" configured={access.youtubeConfigured} connected={access.youtubeConnected} onDisconnect={() => disconnect("youtube")} />
        </div>

        {(!access.spotifyConfigured || !access.youtubeConfigured) && <div className="oauth-setup-note"><div className="eyebrow muted-eyebrow">CHAVES DA SUA CONTA</div><strong>Conclua a configuração OAuth uma vez</strong><p>Cadastre os callbacks do domínio Vercel nos consoles de desenvolvedor e adicione os IDs e secrets como variáveis do projeto. O guia no README lista os nomes exatos e os passos de cada provedor.</p><div><code>/api/auth/spotify/callback</code><code>/api/auth/youtube/callback</code></div></div>}
        </div>

        <div className="divider" />
        <div className="source-heading"><div><div className="eyebrow muted-eyebrow">01 / ORIGEM</div><h3>Escolha sua playlist</h3></div><span className="small-lock"><Icon name="lock" size={14} /> NADA É ALTERADO NA ORIGEM</span></div>
        <form className="source-form" onSubmit={importPlaylist}>
          <label className="sr-only" htmlFor="playlist-url">Link da playlist do Spotify</label>
          <Icon name="link" size={20} />
          <input id="playlist-url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Cole aqui o link de uma playlist do Spotify" type="url" required disabled={!access.spotifyConnected || loadingSource} />
          <button className="primary-button" type="submit" disabled={!access.spotifyConnected || loadingSource}>{loadingSource ? <><span className="spinner" /> LENDO</> : <>CARREGAR <Icon name="arrow" size={17} /></>}</button>
        </form>
        {!access.spotifyConnected && <p className="field-hint">Conecte o Spotify acima para listar playlists privadas e públicas que sua conta pode acessar.</p>}
        <div className="source-footnote"><span><Icon name="lock" size={14} /> SUA PLAYLIST ORIGINAL FICA INTACTA</span><span>LINK DE PLAYLIST DO SPOTIFY</span></div>

        {notice && <div className={`notice notice-${notice.kind}`} role="status"><span className="notice-symbol">{notice.kind === "success" ? <Icon name="check" size={17} /> : <Icon name={notice.kind === "info" ? "spark" : "info"} size={17} />}</span>{notice.text}<button aria-label="Fechar aviso" onClick={() => setNotice(null)}>×</button></div>}

        {playlist && <section className="playlist-preview" aria-labelledby="playlist-preview-title">
          <div className="preview-topline"><div><div className="eyebrow muted-eyebrow">02 / SELEÇÃO</div><h3 id="playlist-preview-title">Revise antes de levar</h3></div><button className="reset-button" onClick={() => {
            if ((destinationPlaylistId || tracks.some((track) => track.searched || track.added)) && !window.confirm("Há progresso salvo nesta playlist. Trocar vai descartar o rascunho local.")) return;
            setPlaylist(null); setTracks([]); setJobState("idle"); setResultUrl(""); setDestinationPlaylistId("");
          }}>Trocar playlist</button></div>
          <div className="playlist-summary">
            <div className="cover-art">{playlist.cover ? <img src={playlist.cover} alt="" /> : <Icon name="music" size={28} />}</div>
            <div className="summary-copy"><strong>{playlist.name}</strong><span>{tracks.length} de {playlist.total} faixas carregadas</span></div>
            <span className="private-pill"><Icon name="lock" size={13} /> DESTINO PRIVADO</span>
          </div>

          <div className="quota-callout"><Icon name="spark" size={17} /><span>O MudaSom não impõe limite de faixas. A cota inicial gratuita do YouTube permite <strong>100 buscas por dia por projeto</strong>; quando ela termina, as faixas restantes ficam pendentes para retomar depois. <a href="https://developers.google.com/youtube/v3/determine_quota_cost" target="_blank" rel="noreferrer">Ver cota <Icon name="external" size={12} /></a> · <a href="https://support.google.com/youtube/contact/yt_api_form?hl=en" target="_blank" rel="noreferrer">Pedir aumento</a></span><b>{selectedCount} selecionadas</b></div>
          <p className="draft-note">O progresso fica salvo neste navegador para retomada; sua biblioteca não é armazenada no servidor do MudaSom.</p>

          <div className="track-toolbar"><div><strong>{tracks.length} faixas carregadas</strong><span>As correspondências são sugestões: confirme a versão antes de transferir.</span></div><button className="outline-button" onClick={matchTracks} disabled={jobState === "matching" || searchableCount === 0 || !access.youtubeConnected}>{jobState === "matching" ? <><span className="spinner dark-spinner" /> PESQUISANDO {jobProgress.current}/{jobProgress.total}</> : searchableCount ? <><Icon name="refresh" size={16} /> BUSCAR NO YOUTUBE · {searchableCount}</> : <>BUSCAS CONCLUÍDAS</>}</button></div>

          <div className="track-list">
            {tracks.map((track, index) => <article className={`track-row ${!track.selected ? "track-unselected" : ""}`} key={track.key}>
              <label className="track-check"><input type="checkbox" checked={track.selected} disabled={["matching", "creating", "adding"].includes(jobState)} onChange={(event) => toggleTrack(track.key, event.target.checked)} aria-label={`Selecionar ${track.name}`} /><span /></label>
              <span className="track-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="track-title"><strong>{track.name}</strong><small>{track.artists.join(", ")}{track.album ? ` · ${track.album}` : ""}</small></span>
              <span className="track-match">
                {track.matching ? <span className="match-loading"><i /> buscando</span> : track.error ? <span className="match-missing">{track.error}</span> : track.candidates.length ? <label className="candidate-picker"><span className={track.candidates.find((candidate) => candidate.id === track.videoId)?.score && track.candidates.find((candidate) => candidate.id === track.videoId)!.score < 50 ? "score-low" : "score-ok"}>{track.candidates.find((candidate) => candidate.id === track.videoId)?.score ?? 0}%</span><select value={track.videoId} onChange={(event) => chooseVideo(track.key, event.target.value)} aria-label={`Escolha a versão de ${track.name}`}>{track.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.title} — {candidate.channel} · {candidate.score}%</option>)}</select><a href={track.candidates.find((candidate) => candidate.id === track.videoId)?.url} target="_blank" rel="noreferrer" aria-label="Abrir faixa sugerida no YouTube"><Icon name="external" size={14} /></a></label> : <span className="match-pending">AGUARDANDO BUSCA</span>}
              </span>
            </article>)}
          </div>
          {playlist.nextOffset !== null ? <div className="load-more-row"><span>{tracks.length} faixas exibidas · carregamos a playlist em páginas para suportar listas grandes.</span><button className="outline-button" onClick={loadMoreTracks} disabled={loadingMore}>{loadingMore ? <><span className="spinner dark-spinner" /> CARREGANDO</> : <>CARREGAR PRÓXIMAS 100 <Icon name="arrow" size={15} /></>}</button></div> : <p className="list-limit">Todas as faixas acessíveis desta playlist foram carregadas.</p>}

          {jobState === "adding" && <div className="transfer-progress"><div><span>CRIANDO SUA PLAYLIST</span><b>{jobProgress.current} / {jobProgress.total}</b></div><div className="progress-track"><i style={{ width: `${jobProgress.total ? jobProgress.current / jobProgress.total * 100 : 0}%` }} /></div></div>}
          {resultUrl && <a className={`created-playlist ${transferComplete || jobState === "done" ? "created-success" : "created-partial"}`} href={resultUrl} target="_blank" rel="noreferrer"><span><Icon name={transferComplete || jobState === "done" ? "check" : "music"} size={17} />{transferComplete || jobState === "done" ? "Playlist criada" : "Playlist de destino"}</span><b>ABRIR NO YOUTUBE <Icon name="external" size={14} /></b></a>}

          <div className="transfer-footer"><span>{readyCount} correspondências · {addedCount} adicionadas · {remainingCount} ainda para transferir</span><button className="primary-button transfer-button" onClick={createPlaylist} disabled={remainingCount === 0 || ["matching", "creating", "adding"].includes(jobState) || !access.youtubeConnected}>{jobState === "creating" || jobState === "adding" ? <><span className="spinner" /> LEVANDO {jobProgress.current}/{jobProgress.total}</> : destinationPlaylistId ? <>RETOMAR TRANSFERÊNCIA <Icon name="arrow" size={17} /></> : <>CRIAR PLAYLIST PRIVADA <Icon name="arrow" size={17} /></>}</button></div>
        </section>}
      </section>

      <section className="why-strip"><div><span className="strip-number">A.</span><strong>Você mantém o controle</strong><p>O MudaSom sugere. Você escolhe o que vai para a nova lista.</p></div><div><span className="strip-number">B.</span><strong>Privada desde o começo</strong><p>A playlist de destino começa privada na sua conta do YouTube.</p></div><div><span className="strip-number">C.</span><strong>Seu acesso fica protegido</strong><p>Tokens criptografados e usados apenas no servidor da sua aplicação.</p></div></section>

      <footer className="footer"><a className="footer-brand" href="#top"><BrandMark /><span>mudasom</span></a><span>UM PROJETO PESSOAL · LICENÇA MIT</span><span>© 2026</span></footer>
    </main>
  );
}

function ConnectionCard({ provider, configured, connected, onDisconnect }: { provider: "spotify" | "youtube"; configured: boolean; connected: boolean; onDisconnect: () => void }) {
  const spotify = provider === "spotify";
  return <div className={`provider-card ${connected ? "provider-connected" : ""}`}>
    <div className={`provider-mark ${spotify ? "spotify-mark" : "youtube-mark"}`}>{spotify ? <span className="spotify-glyph">≋</span> : <span className="play-glyph">▶</span>}</div>
    <div className="provider-copy"><strong>{spotify ? "Spotify" : "YouTube Music"}</strong><small>{connected ? "Conta conectada" : configured ? spotify ? "Sua playlist de origem" : "Seu destino de música" : "Configure o OAuth no Vercel"}</small></div>
    {connected ? <button className="connected-action" onClick={onDisconnect}><span><i /> CONECTADO</span><span className="disconnect-word">DESCONECTAR</span></button> : configured ? <a className={`connect-action ${spotify ? "connect-spotify" : "connect-youtube"}`} href={`/api/auth/${provider}`}><span>CONECTAR</span><Icon name="arrow" size={15} /></a> : <span className="connection-missing">FALTA CONFIG.</span>}
  </div>;
}
