import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade — MudaSom",
  description: "Como o MudaSom trata dados de playlists e tokens de conta.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <header className="legal-top"><Link href="/" className="legal-brand"><span className="brand-mark"><span /><span /><span /><span /><span /></span> mudasom</Link><span>PRIVACIDADE · VERSÃO 1 · 26 SET 2026</span></header>
      <article className="legal-content">
        <div className="eyebrow muted-eyebrow">DOCUMENTO DO APLICATIVO</div>
        <h1>Política de privacidade</h1>
        <p className="legal-lede">Esta instância do MudaSom é pessoal. O app usa seus dados apenas para carregar, revisar e transferir as playlists que você escolhe.</p>

        <h2>1. Dados tratados</h2>
        <p>Quando você transfere uma playlist, o app recebe do Spotify o nome da playlist e os metadados das faixas selecionadas, como título, artistas, álbum e identificador. Para pesquisar correspondências, envia título e artistas à API do YouTube. Se você aprovar um resultado, usa o identificador do vídeo para adicioná-lo à sua playlist privada do YouTube.</p>
        <p>O app também precisa de tokens OAuth para agir nas contas que você conectou. Não pede nem recebe a senha do Spotify ou do Google.</p>

        <h2>2. Onde os dados ficam</h2>
        <p>O MudaSom não usa banco de dados próprio. O rascunho de transferência — faixas carregadas, sugestões, escolhas e progresso — fica no armazenamento local do navegador para permitir retomada. Ele é removido ao sair ou trocar a playlist; você também pode apagá-lo limpando os dados do site no navegador.</p>
        <p>Os tokens OAuth e a sessão de acesso ficam em cookies HTTP-only criptografados pelo servidor com AES-GCM. O código do servidor roda como funções da Vercel e encaminha solicitações às APIs dos provedores. Não usamos os dados para publicidade, venda ou treinamento de modelos.</p>

        <h2>3. Cookies e duração</h2>
        <p>Cookies são necessários para proteger a senha do app e manter as conexões. Eles são HTTP-only, usam HTTPS em produção e têm duração de até 14 dias, renovada durante o uso. Os refresh tokens continuam sujeitos à validade, revogação e regras do Spotify e Google.</p>

        <h2>4. Compartilhamento com provedores</h2>
        <p>O Spotify recebe solicitações para ler as playlists autorizadas. O Google/YouTube recebe pesquisas por faixa e comandos para criar ou preencher uma playlist. A Vercel hospeda o código e executa as funções. Cada serviço aplica sua própria política de privacidade e seus próprios registros operacionais.</p>

        <h2>5. Remoção e desconexão</h2>
        <p>Use “Sair” para remover a sessão e o rascunho local. Use “Desconectar” em um serviço para apagar seus tokens do MudaSom. Isso não revoga sozinho a autorização concedida no Spotify ou Google; você pode removê-la nas configurações de aplicativos conectados desses serviços.</p>

        <h2>6. Contato e alterações</h2>
        <p>Para dúvidas sobre o tratamento de dados ou sobre o código, abra uma questão no <a href="https://github.com/osamuelnovaes/mudasom/issues" target="_blank" rel="noreferrer">repositório do MudaSom</a>. Esta política pode ser atualizada junto com o app; mudanças que exijam novo consentimento serão apresentadas antes de conectar uma conta.</p>

        <p className="legal-updated">Última atualização: 26 de setembro de 2026.</p>
        <Link href="/" className="legal-back">← Voltar ao MudaSom</Link>
      </article>
    </main>
  );
}
