import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso — MudaSom",
  description: "Termos de uso do MudaSom, uma ferramenta pessoal de transferência de playlists.",
};

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <header className="legal-top"><Link href="/" className="legal-brand"><span className="brand-mark"><span /><span /><span /><span /><span /></span> mudasom</Link><span>TERMOS DE USO · VERSÃO 1 · 26 SET 2026</span></header>
      <article className="legal-content">
        <div className="eyebrow muted-eyebrow">DOCUMENTO DO APLICATIVO</div>
        <h1>Termos de uso</h1>
        <p className="legal-lede">O MudaSom é uma ferramenta open source para uso pessoal que ajuda a levar playlists entre serviços de música.</p>

        <h2>1. Uso do MudaSom</h2>
        <p>Você pode usar o MudaSom para acessar playlists da sua própria conta do Spotify, pesquisar faixas no YouTube e criar uma playlist privada na sua conta Google. Você é responsável por manter suas contas e credenciais seguras e por revisar cada correspondência antes de transferi-la.</p>

        <h2>2. Serviços de terceiros</h2>
        <p>O MudaSom usa as APIs do Spotify e do YouTube/Google. Ao conectar uma conta, você também fica sujeito aos termos, políticas, limites e decisões desses serviços. Eles podem alterar ou interromper APIs, aplicar cotas ou deixar faixas indisponíveis. O MudaSom não controla esses serviços nem garante que cada correspondência seja a gravação desejada.</p>
        <p>O MudaSom não reproduz nem baixa áudio. Ele transfere metadados de faixas e adiciona ao destino vídeos que você seleciona. Você não deve usar o app para contornar controles, obter cópias de áudio ou violar direitos de terceiros.</p>

        <h2>3. Contas, dados e autorização</h2>
        <p>Você autoriza o MudaSom a ler as playlists que seleciona no Spotify e, no YouTube, pesquisar vídeos, criar playlists privadas e incluir os vídeos que você aprova. Você pode desconectar uma conta no app; isso apaga as credenciais locais do MudaSom. Para revogar também a autorização no serviço, use as configurações de aplicativos conectados do Spotify ou do Google.</p>

        <h2>4. Disponibilidade e responsabilidade</h2>
        <p>O software é fornecido “como está”, sem garantia de disponibilidade, correspondência exata ou adequação a uma necessidade específica. Confirme o nome, artista e canal de cada sugestão. Você mantém as playlists originais; a transferência cria uma lista separada no destino.</p>

        <h2>5. Direitos e marcas</h2>
        <p>O código-fonte do MudaSom é distribuído sob a licença MIT. A licença não concede direitos sobre Spotify, YouTube, Google, seus catálogos, marcas ou conteúdo. Spotify e Google são terceiros beneficiários das cláusulas destes termos que protegem seus serviços, conteúdo, dados e propriedade intelectual.</p>

        <h2>6. Encerramento e contato</h2>
        <p>Você pode parar de usar o app a qualquer momento, sair e desconectar as contas. Para dúvidas sobre o código, use o <a href="https://github.com/osamuelnovaes/mudasom/issues" target="_blank" rel="noreferrer">repositório do MudaSom</a>. Estes termos não substituem os termos dos provedores.</p>

        <p className="legal-updated">Última atualização: 26 de setembro de 2026.</p>
        <Link href="/" className="legal-back">← Voltar ao MudaSom</Link>
      </article>
    </main>
  );
}
