"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { TrackInput, TrackCandidate } from "@/lib/music";

type Provider = "spotify" | "youtube";

type AccessState = {
  configured: boolean;
  authenticated: boolean;
  termsAccepted: boolean;
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
  sourceUrl: string;
  total: number;
  sourceProvider: Provider;
  nextCursor: string | null;
};

type TransferTrack = TrackInput & {
  key: string;
  selected: boolean;
  candidates: TrackCandidate[];
  targetItemId: string;
  searched: boolean;
  matching: boolean;
  added: boolean;
  error: string;
};

type Notice = { kind: "success" | "error" | "info"; text: string };

function providerName(provider: Provider) {
  return provider === "spotify" ? "Spotify" : "YouTube Music";
}

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

function SpotifyLogo({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0Zm5.49 17.305a.748.748 0 0 1-1.03.249c-2.82-1.724-6.369-2.11-10.551-1.155a.75.75 0 0 1-.332-1.462c4.579-1.04 8.605-.505 11.664 1.367a.75.75 0 0 1 .249 1.03Zm1.47-3.272a.94.94 0 0 1-1.29.31c-3.23-1.987-8.154-2.56-11.978-1.39a.938.938 0 0 1-.55-1.793c4.368-1.33 9.793-.687 13.508 1.593a.938.938 0 0 1 .31 1.29Zm.127-3.407C15.215 8.326 8.82 8.114 5.114 9.238a1.125 1.125 0 0 1-.652-2.153c4.253-1.29 11.322-1.04 15.793 1.617a1.125 1.125 0 0 1-1.169 1.924Z" /></svg>;
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /><span /></div>;
}

function AccessGate({ configured }: { configured: boolean }) {
  const [deployed, setDeployed] = useState(false);

  useEffect(() => {
    setDeployed(!["localhost", "127.0.0.1"].includes(window.location.hostname));
  }, []);

  return (
    <main className="gate-shell">
      <div className="gate-glow" />
      <header className="gate-brand"><BrandMark /><span>mudasom</span><span className="beta-chip">USO PESSOAL</span></header>
      <section className="gate-card">
        <div className="eyebrow"><Icon name="lock" size={15} /> COFRE PARTICULAR</div>
        <h1>Sua música.<br /><em>Seu espaço.</em></h1>
        <p>Um lugar privado para levar suas playlists de um serviço para outro, com cada faixa revisada por você.</p>
        {!configured ? (
          <div className="setup-note"><strong>Falta preparar a sessão segura.</strong><span>{deployed ? <>Defina <code>APP_SESSION_SECRET</code> com pelo menos 32 caracteres nas variáveis do projeto Vercel e faça redeploy.</> : <>Defina <code>APP_SESSION_SECRET</code> com pelo menos 32 caracteres no arquivo <code>.env.local</code>.</>}</span></div>
        ) : (
          <div className="setup-note"><strong>Entre pela Vercel.</strong><span>Este preview usa a autenticação da Vercel como única proteção de acesso.</span></div>
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
  const [sourceProvider, setSourceProvider] = useState<Provider>("spotify");
  const [targetProvider, setTargetProvider] = useState<Provider>("youtube");
  const [playlist, setPlaylist] = useState<ImportedPlaylist | null>(null);
  const [tracks, setTracks] = useState<TransferTrack[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [destinationPlaylistId, setDestinationPlaylistId] = useState("");
  const [jobState, setJobState] = useState<"idle" | "matching" | "creating" | "adding" | "done">("idle");
  const [jobProgress, setJobProgress] = useState({ current: 0, total: 0 });
  const [resultUrl, setResultUrl] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

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
    if (connected === "youtube") setNotice({ kind: "success", text: "YouTube conectado." });
    const errors: Record<string, string> = {
      "spotify-config": "Faltam as credenciais do Spotify no ambiente.",
      "youtube-config": "Faltam as credenciais do Google no ambiente.",
      "spotify-state": "A conexão com o Spotify expirou. Tente novamente.",
      "youtube-state": "A conexão com o YouTube expirou. Tente novamente.",
      "spotify-token": "O Spotify não concluiu a autorização. Confira o callback cadastrado.",
      "youtube-token": "O Google não concluiu a autorização. Confira o callback cadastrado.",
      "youtube-refresh": "O Google não retornou acesso offline. Reconecte e aceite as permissões.",
      "auth-required": "Entre na Vercel antes de conectar uma plataforma.",
      "terms-required": "Leia e aceite os Termos de uso antes de conectar uma conta.",
    };
    if (error && errors[error]) setNotice({ kind: "error", text: errors[error] });
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);
  }, [refreshAccess]);

  useEffect(() => {
    if (!access?.authenticated || draftReady) return;
    try {
      const raw = window.localStorage.getItem("mudasom-transfer-draft-v3");
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.version === 3 && draft.playlist && Array.isArray(draft.tracks) && typeof draft.playlist.id === "string") {
          setPlaylist(draft.playlist as ImportedPlaylist);
          setTracks(draft.tracks as TransferTrack[]);
          setSourceUrl(typeof draft.sourceUrl === "string" ? draft.sourceUrl : draft.playlist.id);
          setSourceProvider(draft.sourceProvider === "youtube" ? "youtube" : "spotify");
          setTargetProvider(draft.targetProvider === "spotify" ? "spotify" : "youtube");
          setDestinationPlaylistId(typeof draft.destinationPlaylistId === "string" ? draft.destinationPlaylistId : "");
          setResultUrl(typeof draft.resultUrl === "string" ? draft.resultUrl : "");
        }
      }
    } catch {
      window.localStorage.removeItem("mudasom-transfer-draft-v3");
    }
    setDraftReady(true);
  }, [access?.authenticated, draftReady]);

  useEffect(() => {
    if (!access?.authenticated || !draftReady) return;
    const timeout = window.setTimeout(() => {
      if (playlist && tracks.length) {
        try {
          window.localStorage.setItem("mudasom-transfer-draft-v3", JSON.stringify({
            version: 3, sourceUrl, sourceProvider, targetProvider, playlist, tracks, destinationPlaylistId, resultUrl,
          }));
        } catch { /* The current tab can continue even if browser storage is full. */ }
      } else {
        window.localStorage.removeItem("mudasom-transfer-draft-v3");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [access?.authenticated, draftReady, destinationPlaylistId, playlist, resultUrl, sourceProvider, sourceUrl, targetProvider, tracks]);

  const selectedCount = useMemo(() => tracks.filter((track) => track.selected).length, [tracks]);
  const searchableCount = useMemo(() => tracks.filter((track) => track.selected && !track.searched).length, [tracks]);
  const readyCount = useMemo(() => tracks.filter((track) => track.selected && track.targetItemId).length, [tracks]);
  const remainingCount = useMemo(() => tracks.filter((track) => track.selected && track.targetItemId && !track.added).length, [tracks]);
  const addedCount = useMemo(() => tracks.filter((track) => track.added).length, [tracks]);
  const transferComplete = Boolean(destinationPlaylistId && readyCount > 0 && remainingCount === 0 && searchableCount === 0);
  const targetConnected = targetProvider === "spotify" ? access?.spotifyConnected : access?.youtubeConnected;
  const sourceConnected = sourceProvider === "spotify" ? access?.spotifyConnected : access?.youtubeConnected;
  const currentStep = !sourceConnected ? 1 : !playlist ? 2 : transferComplete || jobState === "done" ? 4 : 3;

  async function updateTermsConsent(accepted: boolean) {
    setConsentBusy(true);
    try {
      await responseJson<{ accepted: boolean }>(await fetch("/api/access/consent", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted }),
      }));
      await refreshAccess();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Não consegui salvar sua escolha." });
    } finally { setConsentBusy(false); }
  }

  async function logout() {
    await fetch("/api/access/logout", { method: "POST" });
    window.localStorage.removeItem("mudasom-transfer-draft-v1");
    window.localStorage.removeItem("mudasom-transfer-draft-v2");
    window.localStorage.removeItem("mudasom-transfer-draft-v3");
    setTracks([]); setPlaylist(null); setResultUrl(""); setDestinationPlaylistId(""); setJobState("idle"); setDraftReady(false);
    await refreshAccess();
  }

  async function disconnect(provider: "spotify" | "youtube") {
    await fetch(`/api/auth/${provider}/disconnect`, { method: "POST" });
    await refreshAccess();
    setNotice({ kind: "info", text: `${provider === "spotify" ? "Spotify" : "YouTube"} desconectado.` });
  }

  function chooseSourceProvider(provider: Provider) {
    setSourceProvider(provider);
    setTargetProvider(provider === "spotify" ? "youtube" : "spotify");
    setSourceUrl("");
  }

  function chooseTargetProvider(provider: Provider) {
    setTargetProvider(provider);
    setSourceProvider(provider === "spotify" ? "youtube" : "spotify");
    setSourceUrl("");
  }

  async function importPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (playlist && (destinationPlaylistId || tracks.some((track) => track.searched || track.added)) && !window.confirm("Há progresso salvo nesta playlist. Trocar agora vai descartar o rascunho local.")) return;
    setLoadingSource(true); setNotice(null); setPlaylist(null); setTracks([]); setResultUrl(""); setDestinationPlaylistId(""); setJobState("idle");
    try {
      const result = await responseJson<{ playlist: ImportedPlaylist; tracks: Array<TrackInput & { id: string }> }>(await fetch("/api/transfer/source", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceProvider, playlistUrl: sourceUrl, cursor: "" }),
      }));
      setPlaylist(result.playlist);
      setTracks(result.tracks.map((track, index) => ({
        ...track, key: `${track.id}-${index}`, selected: true, candidates: [], targetItemId: "", searched: false, matching: false, added: false, error: "",
      })));
      setNotice({ kind: "success", text: `${result.tracks.length} faixas carregadas de “${result.playlist.name}”.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível abrir essa playlist." });
    } finally { setLoadingSource(false); }
  }

  async function loadMoreTracks() {
    if (!playlist || playlist.nextCursor === null || loadingMore) return;
    const cursor = playlist.nextCursor;
    setLoadingMore(true);
    setNotice(null);
    try {
      const result = await responseJson<{ playlist: ImportedPlaylist; tracks: Array<TrackInput & { id: string }> }>(await fetch("/api/transfer/source", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceProvider, playlistUrl: playlist.id, cursor }),
      }));
      setTracks((current) => [...current, ...result.tracks.map((track, index) => ({
        ...track, key: `${track.id}-${current.length + index}`, selected: true, candidates: [], targetItemId: "", searched: false, matching: false, added: false, error: "",
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
    const targetConnected = targetProvider === "spotify" ? access?.spotifyConnected : access?.youtubeConnected;
    if (!targetConnected) { setNotice({ kind: "error", text: `Conecte sua conta do ${targetProvider === "spotify" ? "Spotify" : "YouTube Music"} para encontrar as faixas.` }); return; }
    setJobState("matching"); setJobProgress({ current: 0, total: selected.length }); setNotice({ kind: "info", text: `Pesquisando no ${targetProvider === "spotify" ? "Spotify" : "YouTube"}. Se o provedor limitar as buscas, o restante fica pendente para retomar depois.` });
    let failures = 0;
    let quotaReached = false;
    let accessFailed = "";
    let stoppedAfterFailures = false;
    for (let index = 0; index < selected.length; index += 1) {
      const track = selected[index];
      setTracks((current) => current.map((item) => item.key === track.key ? { ...item, matching: true, error: "" } : item));
      try {
        const result = await responseJson<{ candidates: TrackCandidate[] }>(await fetch("/api/transfer/match", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetProvider, track: { name: track.name, artists: track.artists, album: track.album, durationMs: track.durationMs } }),
        }));
        const candidates = result.candidates ?? [];
        setTracks((current) => current.map((item) => item.key === track.key
          ? { ...item, candidates, targetItemId: candidates[0]?.id ?? "", searched: true, matching: false, error: candidates.length ? "" : "Nenhum resultado encontrado." }
          : item));
      } catch (error) {
        if (error instanceof ApiError && ["YOUTUBE_QUOTA", "YOUTUBE_API_DISABLED", "YOUTUBE_ACCESS", "SPOTIFY_RATE_LIMIT", "SPOTIFY_ACCESS"].includes(error.code ?? "")) {
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
      : { kind: "success", text: `Sugestões do ${targetProvider === "spotify" ? "Spotify" : "YouTube"} carregadas. Revise a versão de cada faixa.` });
  }

  function chooseCandidate(key: string, targetItemId: string) {
    setTracks((current) => current.map((track) => track.key === key ? { ...track, targetItemId } : track));
  }

  async function createPlaylist() {
    const chosen = tracks.filter((track) => track.selected && track.targetItemId && !track.added);
    if (!playlist || chosen.length === 0) { setNotice({ kind: "error", text: "Nenhuma faixa revisada está pronta para transferir." }); return; }
    setNotice(null); setJobState(destinationPlaylistId ? "adding" : "creating"); setJobProgress({ current: 0, total: chosen.length });
    let targetId = destinationPlaylistId;
    let targetUrl = resultUrl;
    try {
      if (!targetId) {
        const created = await responseJson<{ id: string; url: string }>(await fetch("/api/transfer/create", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetProvider, name: playlist.name }),
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
          body: JSON.stringify({ targetProvider, playlistId: targetId, itemId: track.targetItemId }),
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
  if (!access.configured || !access.authenticated) return <AccessGate configured={access.configured} />;

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MudaSom início"><BrandMark /><span>mudasom</span><sup>beta</sup></a>
        <div className="topbar-right"><span className="private-indicator"><i /> ESPAÇO PRIVADO</span><button className="text-button" onClick={logout}>Limpar dados</button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SUA BIBLIOTECA, EM MOVIMENTO</div>
          <h1>A música vai<br /><em>junto com você.</em></h1>
          <p>Leve suas playlists entre serviços sem refazer tudo na mão. O MudaSom procura correspondências e você confere cada faixa antes de criar a lista de destino.</p>
          <div className="hero-meta"><span><Icon name="lock" size={16} /> PRIVADO POR PADRÃO</span><span>01 → 02 PLATAFORMAS</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustração de um disco atravessando entre dois serviços">
          <div className="orbit orbit-a" /><div className="orbit orbit-b" />
          <div className="record"><div className="record-ring ring-one" /><div className="record-ring ring-two" /><div className="record-ring ring-three" /><div className="record-center"><BrandMark /></div></div>
          <div className="service-bubble bubble-spotify"><SpotifyLogo size={31} /></div>
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

        <label className={`terms-consent ${access.termsAccepted ? "terms-consent-accepted" : ""}`}>
          <input type="checkbox" checked={access.termsAccepted} disabled={consentBusy} onChange={(event) => void updateTermsConsent(event.target.checked)} />
          <span>Li e aceito os <a href="/terms" target="_blank" rel="noreferrer">Termos de uso</a> e li a <a href="/privacy" target="_blank" rel="noreferrer">Política de Privacidade</a>. Só então conecto minhas contas.</span>
          {consentBusy && <span className="consent-saving">SALVANDO</span>}
        </label>

        <div className="service-routing">
          <label><small>ORIGEM</small><select value={sourceProvider} disabled={Boolean(playlist) || ["matching", "creating", "adding"].includes(jobState)} onChange={(event) => chooseSourceProvider(event.target.value as Provider)}><option value="spotify">Spotify</option><option value="youtube">YouTube Music</option></select></label>
          <Icon name="arrow" size={18} />
          <label><small>DESTINO</small><select value={targetProvider} disabled={Boolean(playlist) || ["matching", "creating", "adding"].includes(jobState)} onChange={(event) => chooseTargetProvider(event.target.value as Provider)}><option value="spotify">Spotify</option><option value="youtube">YouTube Music</option></select></label>
        </div>

        <div className="connections">
          <div className="connection-block">
            <div className="connection-heading"><span className="connection-number">01</span><div><strong>Origem · {providerName(sourceProvider)}</strong><small>Conecte sua biblioteca de origem</small></div></div>
            <ConnectionCard provider={sourceProvider} usage="source" configured={sourceProvider === "spotify" ? access.spotifyConfigured : access.youtubeConfigured} termsAccepted={access.termsAccepted} connected={sourceProvider === "spotify" ? access.spotifyConnected : access.youtubeConnected} onDisconnect={() => disconnect(sourceProvider)} />
          </div>
          <div className="route-mark"><span /><Icon name="arrow" size={19} /><span /></div>
          <div className="connection-block">
            <div className="connection-heading"><span className="connection-number">02</span><div><strong>Destino · {providerName(targetProvider)}</strong><small>Conecte sua conta de destino</small></div></div>
            <ConnectionCard provider={targetProvider} usage="target" configured={targetProvider === "spotify" ? access.spotifyConfigured : access.youtubeConfigured} termsAccepted={access.termsAccepted} connected={targetProvider === "spotify" ? access.spotifyConnected : access.youtubeConnected} onDisconnect={() => disconnect(targetProvider)} />
        </div>

        {(!access.spotifyConfigured || !access.youtubeConfigured) && <div className="oauth-setup-note"><div className="eyebrow muted-eyebrow">CHAVES DA SUA CONTA</div><strong>Conclua a configuração OAuth uma vez</strong><p>Cadastre os callbacks do domínio Vercel nos consoles de desenvolvedor e adicione os IDs e secrets como variáveis do projeto. O guia no README lista os nomes exatos e os passos de cada provedor.</p><div><code>/api/auth/spotify/callback</code><code>/api/auth/youtube/callback</code></div></div>}
        </div>

        <div className="divider" />
        <div className="source-heading"><div><div className="eyebrow muted-eyebrow">01 / {providerName(sourceProvider).toUpperCase()}</div><h3>Escolha sua playlist</h3></div><span className="small-lock"><Icon name="lock" size={14} /> NADA É ALTERADO NA ORIGEM</span></div>
        <form className="source-form" onSubmit={importPlaylist}>
          <label className="sr-only" htmlFor="playlist-url">Link da playlist de {providerName(sourceProvider)}</label>
          <Icon name="link" size={20} />
          <input id="playlist-url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder={`Cole o link da playlist do ${providerName(sourceProvider)}`} type="url" required disabled={!sourceConnected || !access.termsAccepted || loadingSource} />
          <button className="primary-button" type="submit" disabled={!sourceConnected || !access.termsAccepted || loadingSource}>{loadingSource ? <><span className="spinner" /> LENDO</> : <>CARREGAR <Icon name="arrow" size={17} /></>}</button>
        </form>
        {!sourceConnected && <p className="field-hint">Conecte {providerName(sourceProvider)} acima para abrir playlists às quais sua conta tem acesso.</p>}
        <div className="source-footnote"><span><Icon name="lock" size={14} /> SUA PLAYLIST ORIGINAL FICA INTACTA</span><span>LINK DE {providerName(sourceProvider).toUpperCase()}</span></div>

        {notice && <div className={`notice notice-${notice.kind}`} role="status"><span className="notice-symbol">{notice.kind === "success" ? <Icon name="check" size={17} /> : <Icon name={notice.kind === "info" ? "spark" : "info"} size={17} />}</span>{notice.text}<button aria-label="Fechar aviso" onClick={() => setNotice(null)}>×</button></div>}

        {playlist && <section className="playlist-preview" aria-labelledby="playlist-preview-title">
          <div className="preview-topline"><div><div className="eyebrow muted-eyebrow">02 / SELEÇÃO</div><h3 id="playlist-preview-title">Revise antes de levar</h3></div><button className="reset-button" onClick={() => {
            if ((destinationPlaylistId || tracks.some((track) => track.searched || track.added)) && !window.confirm("Há progresso salvo nesta playlist. Trocar vai descartar o rascunho local.")) return;
            setPlaylist(null); setTracks([]); setJobState("idle"); setResultUrl(""); setDestinationPlaylistId("");
          }}>Trocar playlist</button></div>
          <div className="playlist-summary">
            <a className="cover-art" href={playlist.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Abrir playlist de origem no ${providerName(sourceProvider)}`}>{playlist.cover ? <img src={playlist.cover} alt="" /> : <Icon name="music" size={28} />}</a>
            <div className="summary-copy"><strong>{playlist.name}</strong><span>{tracks.length} de {playlist.total} faixas · <a href={playlist.sourceUrl} target="_blank" rel="noreferrer">{providerName(sourceProvider).toUpperCase()} ↗</a></span></div>
            <span className="private-pill"><Icon name="lock" size={13} /> DESTINO PRIVADO · {providerName(targetProvider).toUpperCase()}</span>
          </div>

          {targetProvider === "youtube" ? <div className="quota-callout"><Icon name="spark" size={17} /><span>O MudaSom não impõe limite de faixas. A cota inicial gratuita do YouTube permite <strong>100 buscas por dia por projeto</strong>; quando ela termina, as faixas restantes ficam pendentes para retomar depois. <a href="https://developers.google.com/youtube/v3/determine_quota_cost" target="_blank" rel="noreferrer">Ver cota <Icon name="external" size={12} /></a> · <a href="https://support.google.com/youtube/contact/yt_api_form?hl=en" target="_blank" rel="noreferrer">Pedir aumento</a></span><b>{selectedCount} selecionadas</b></div> : <div className="quota-callout"><Icon name="spark" size={17} /><span>O MudaSom não impõe limite de faixas. O Spotify pode aplicar rate limits; se isso acontecer, as faixas pendentes ficam salvas para retomar depois.</span><b>{selectedCount} selecionadas</b></div>}
          <p className="draft-note">O progresso fica salvo neste navegador para retomada; sua biblioteca não é armazenada no servidor do MudaSom.</p>

          <div className="track-toolbar"><div><strong>{tracks.length} faixas carregadas</strong><span>As correspondências são sugestões: confirme a versão antes de transferir.</span></div><button className="outline-button" onClick={matchTracks} disabled={jobState === "matching" || searchableCount === 0 || !targetConnected || !access.termsAccepted}>{jobState === "matching" ? <><span className="spinner dark-spinner" /> PESQUISANDO {jobProgress.current}/{jobProgress.total}</> : searchableCount ? <><Icon name="refresh" size={16} /> BUSCAR NO {providerName(targetProvider).toUpperCase()} · {searchableCount}</> : <>BUSCAS CONCLUÍDAS</>}</button></div>

          <div className="track-list">
            {tracks.map((track, index) => <article className={`track-row ${!track.selected ? "track-unselected" : ""}`} key={track.key}>
              <label className="track-check"><input type="checkbox" checked={track.selected} disabled={["matching", "creating", "adding"].includes(jobState)} onChange={(event) => toggleTrack(track.key, event.target.checked)} aria-label={`Selecionar ${track.name}`} /><span /></label>
              <span className="track-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="track-title"><strong>{track.name}{track.sourceUrl && <a className="source-attribution" href={track.sourceUrl} target="_blank" rel="noreferrer">{sourceProvider === "spotify" && <SpotifyLogo size={11} />}{providerName(sourceProvider).toUpperCase()} ↗</a>}</strong><small>{track.artists.join(", ")}{track.album ? ` · ${track.album}` : ""}</small></span>
              <span className="track-match">
                {track.matching ? <span className="match-loading"><i /> buscando</span> : track.error ? <span className="match-missing">{track.error}</span> : track.candidates.length ? <label className="candidate-picker"><span className={track.candidates.find((candidate) => candidate.id === track.targetItemId)?.score && track.candidates.find((candidate) => candidate.id === track.targetItemId)!.score < 50 ? "score-low" : "score-ok"}>{track.candidates.find((candidate) => candidate.id === track.targetItemId)?.score ?? 0}%</span><select value={track.targetItemId} onChange={(event) => chooseCandidate(track.key, event.target.value)} aria-label={`Escolha a versão de ${track.name}`}>{track.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.title} — {candidate.channel} · {candidate.score}%</option>)}</select><a href={track.candidates.find((candidate) => candidate.id === track.targetItemId)?.url} target="_blank" rel="noreferrer" aria-label={`Abrir faixa sugerida no ${providerName(targetProvider)}`}>{targetProvider === "spotify" && <SpotifyLogo size={11} />}<span className="destination-attribution">{targetProvider.toUpperCase()}</span><Icon name="external" size={14} /></a></label> : <span className="match-pending">AGUARDANDO BUSCA</span>}
              </span>
            </article>)}
          </div>
          {playlist.nextCursor !== null ? <div className="load-more-row"><span>{tracks.length} faixas exibidas · carregamos a playlist em páginas para suportar listas grandes.</span><button className="outline-button" onClick={loadMoreTracks} disabled={loadingMore}>{loadingMore ? <><span className="spinner dark-spinner" /> CARREGANDO</> : <>CARREGAR MAIS <Icon name="arrow" size={15} /></>}</button></div> : <p className="list-limit">Todas as faixas acessíveis desta playlist foram carregadas.</p>}

          {jobState === "adding" && <div className="transfer-progress"><div><span>CRIANDO SUA PLAYLIST</span><b>{jobProgress.current} / {jobProgress.total}</b></div><div className="progress-track"><i style={{ width: `${jobProgress.total ? jobProgress.current / jobProgress.total * 100 : 0}%` }} /></div></div>}
          {resultUrl && <a className={`created-playlist ${transferComplete || jobState === "done" ? "created-success" : "created-partial"}`} href={resultUrl} target="_blank" rel="noreferrer"><span><Icon name={transferComplete || jobState === "done" ? "check" : "music"} size={17} />{transferComplete || jobState === "done" ? "Playlist criada" : "Playlist de destino"}</span><b>ABRIR NO {providerName(targetProvider).toUpperCase()} <Icon name="external" size={14} /></b></a>}

          <div className="transfer-footer"><span>{readyCount} correspondências · {addedCount} adicionadas · {remainingCount} ainda para transferir</span><button className="primary-button transfer-button" onClick={createPlaylist} disabled={remainingCount === 0 || ["matching", "creating", "adding"].includes(jobState) || !targetConnected || !access.termsAccepted}>{jobState === "creating" || jobState === "adding" ? <><span className="spinner" /> LEVANDO {jobProgress.current}/{jobProgress.total}</> : destinationPlaylistId ? <>RETOMAR TRANSFERÊNCIA <Icon name="arrow" size={17} /></> : <>CRIAR PLAYLIST PRIVADA <Icon name="arrow" size={17} /></>}</button></div>
        </section>}
      </section>

      <section className="why-strip"><div><span className="strip-number">A.</span><strong>Você mantém o controle</strong><p>O MudaSom sugere. Você escolhe o que vai para a nova lista.</p></div><div><span className="strip-number">B.</span><strong>Privada desde o começo</strong><p>A playlist de destino começa privada na sua conta do YouTube.</p></div><div><span className="strip-number">C.</span><strong>Seu acesso fica protegido</strong><p>Tokens criptografados e usados apenas no servidor da sua aplicação.</p></div></section>

      <footer className="footer"><a className="footer-brand" href="#top"><BrandMark /><span>mudasom</span></a><nav className="footer-links"><a href="/terms">TERMOS</a><a href="/privacy">PRIVACIDADE</a></nav><span>USO PESSOAL · LICENÇA MIT</span><span>© 2026</span></footer>
    </main>
  );
}

function ConnectionCard({ provider, usage, configured, termsAccepted, connected, onDisconnect }: { provider: Provider; usage: "source" | "target"; configured: boolean; termsAccepted: boolean; connected: boolean; onDisconnect: () => void }) {
  const spotify = provider === "spotify";
  return <div className={`provider-card ${connected ? "provider-connected" : ""}`}>
    <div className={`provider-mark ${spotify ? "spotify-mark" : "youtube-mark"}`}>{spotify ? <SpotifyLogo size={25} /> : <span className="play-glyph">▶</span>}</div>
    <div className="provider-copy"><strong>{spotify ? "Spotify" : "YouTube Music"}</strong><small>{connected ? "Conta conectada" : !termsAccepted ? "Leia e aceite os documentos" : configured ? usage === "source" ? "Sua playlist de origem" : "Seu destino de música" : "Configure o OAuth no Vercel"}</small></div>
    {connected ? <button className="connected-action" onClick={onDisconnect}><span><i /> CONECTADO</span><span className="disconnect-word">DESCONECTAR</span></button> : !termsAccepted ? <span className="connection-missing">ACEITE OS TERMOS</span> : configured ? <a className={`connect-action ${spotify ? "connect-spotify" : "connect-youtube"}`} href={`/api/auth/${provider}`}><span>CONECTAR</span><Icon name="arrow" size={15} /></a> : <span className="connection-missing">FALTA CONFIG.</span>}
  </div>;
}
