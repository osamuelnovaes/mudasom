# MudaSom

MudaSom é um app pessoal para transferir playlists. A primeira integração leva uma playlist do Spotify para uma nova playlist privada do YouTube, que também pode aparecer no YouTube Music. É uma implementação própria inspirada em ferramentas de transferência entre plataformas; não reutiliza código nem identidade visual do SongMirror ou do Tune My Music.

O fluxo pede revisão antes de gravar qualquer coisa:

1. Conecte as contas do Spotify e Google.
2. Cole o link de uma playlist do Spotify.
3. Pesquise opções no YouTube e confira ou troque a versão de cada faixa.
4. Crie uma playlist privada no destino com as faixas aprovadas.

## O que está pronto

- Interface responsiva em português e acesso protegido por senha.
- OAuth do Spotify para ler playlists às quais a conta conectada tem acesso.
- OAuth do Google para pesquisar no YouTube e criar uma playlist privada.
- Revisão manual das correspondências antes de qualquer gravação no destino.
- Sessão criptografada em cookies HTTP-only. Os tokens são usados por rotas no servidor; não há banco de dados. O rascunho da transferência (faixas, sugestões e progresso) fica no armazenamento local do seu navegador para permitir retomada.
- Licença MIT.

## Limites atuais

- A primeira rota é **Spotify → YouTube / YouTube Music**. Outras origens e destinos, sincronização agendada, backup e compartilhamento ainda não estão implementados.
- O MudaSom não impõe um limite total de faixas: ele lê playlists em páginas de 100 itens e permite carregar mais páginas. Projetos novos da YouTube Data API têm cota padrão de 100 chamadas `search.list` por dia, que reinicia à meia-noite no horário do Pacífico. Quando a API negar mais buscas, as faixas restantes ficam pendentes; o rascunho local permite retomar após a reposição da cota. O Google permite solicitar uma ampliação, sujeita a revisão. Veja a [documentação de cotas](https://developers.google.com/youtube/v3/determine_quota_cost) e o [formulário de auditoria e ampliação](https://support.google.com/youtube/contact/yt_api_form?hl=en).
- Cada inclusão em playlist também usa cota do YouTube Data API. Código aberto e gratuito não altera os limites que o Google aplica ao projeto OAuth conectado.
- A busca encontra vídeos do YouTube. Ela não garante que o resultado seja a gravação exata nem que todo vídeo apareça no YouTube Music. Confira título e canal antes de transferir.
- O modo de desenvolvimento do Spotify serve para uso pessoal, mas exige Spotify Premium para o proprietário do app e permite conectar contas previamente autorizadas. Consulte os [modos de cota do Spotify](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).
- O app foi feito para uma pessoa. A senha protege uma implantação pessoal; não é um sistema de contas para vários usuários. Use uma senha longa e mantenha as credenciais OAuth somente em variáveis de ambiente do servidor.
- A transferência faz uma chamada por faixa ao destino. Se a Vercel ou a API do provedor falhar no meio, a tela informa que a playlist pode ter ficado incompleta para você conferir.

## Rodar localmente

Requer Node.js 22 ou mais recente.

```bash
npm install
cp .env.example .env.local
```

Defina `APP_PASSWORD` com pelo menos 16 caracteres e gere `APP_SESSION_SECRET` com:

```bash
openssl rand -base64 48
```

Cole o valor gerado em `.env.local`. Não envie esse arquivo ao GitHub.

### Criar o app do Spotify

1. Crie um app no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Cadastre este redirect URI local, exatamente como está: `http://127.0.0.1:3000/api/auth/spotify/callback`.
3. Copie o client ID e o secret para `SPOTIFY_CLIENT_ID` e `SPOTIFY_CLIENT_SECRET`.
4. Mantenha o app em Development Mode e adicione sua conta Spotify à lista de usuários autorizados. O proprietário do app precisa ter Spotify Premium.

O MudaSom pede os escopos `playlist-read-private` e `playlist-read-collaborative` para acessar as playlists permitidas para a conta conectada.

### Criar o app do Google / YouTube

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative **YouTube Data API v3**.
3. Configure a tela de consentimento OAuth. Para começar, adicione sua conta Google como usuário de teste enquanto o app estiver em teste.
4. Crie um cliente OAuth do tipo **Web application**.
5. Adicione `http://localhost:3000` como origem JavaScript autorizada e `http://localhost:3000/api/auth/youtube/callback` como redirect URI autorizado.
6. Copie o client ID e o secret para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

O MudaSom pede `https://www.googleapis.com/auth/youtube.force-ssl` para pesquisar, criar playlists e adicionar vídeos. Em modo Testing, os refresh tokens expiram depois de 7 dias. Para uso pessoal com menos de 100 usuários, o Google permite usar o app sem verificação, embora mostre um aviso de app não verificado; para uso contínuo, considere publicar o consentimento como In production e aceitar esse aviso. Consulte a [política de refresh tokens](https://developers.google.com/identity/protocols/oauth2#expiration) e a [exceção para uso pessoal](https://support.google.com/cloud/answer/13464323).

Inicie o app:

```bash
npm run dev
```

Abra `http://localhost:3000`. O callback do Spotify usa `127.0.0.1` porque o Spotify exige que o endereço de loopback cadastrado corresponda exatamente; o app pode continuar aberto em `localhost`.

## Publicar na Vercel depois

1. Envie o projeto a um repositório GitHub e importe-o na Vercel.
2. Adicione `APP_PASSWORD`, um novo `APP_SESSION_SECRET`, as credenciais do Spotify e as do Google nas variáveis de ambiente do projeto Vercel.
3. Escolha um endereço estável de produção, por exemplo `https://mudasom-seunome.vercel.app`, e cadastre exatamente estes redirects nos dois consoles:
   - `https://SEU-DOMINIO/api/auth/spotify/callback`
   - `https://SEU-DOMINIO/api/auth/youtube/callback`
4. Defina `SPOTIFY_REDIRECT_URI` e `GOOGLE_REDIRECT_URI` na Vercel com esses mesmos endereços.
5. Faça redeploy depois de salvar as variáveis; em seguida, entre e conecte os dois serviços.

Use redirects diferentes para desenvolvimento local e produção. Nunca coloque secrets OAuth em variáveis `NEXT_PUBLIC_*`. O cookie de sessão e os tokens são criptografados no servidor com `APP_SESSION_SECRET`, marcados como HTTP-only e como `Secure` em produção HTTPS.

## Arquitetura

- Next.js App Router e TypeScript, distribuídos como Vercel Functions.
- Os callbacks OAuth do Spotify e Google rodam no servidor.
- As rotas renovam access tokens expirados; o cookie criptografado guarda refresh tokens e validade da senha de acesso.
- Não requer Docker, processo em segundo plano ou banco de dados local gravável.

## Licença

MIT. Consulte [LICENSE](./LICENSE).
