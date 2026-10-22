# King Launcher — Canais de Voz com Compartilhamento de Tela

App parecido com o Discord, para grupos pequenos:

- **Login com aprovação**: cada pessoa cria a conta (usuário e senha) e só entra depois que o **dono** aprovar
- **Dono e moderadores**: fechar o microfone de alguém, parar transmissão/câmera, expulsar da chamada, banir, aprovar contas e dar o cargo de moderador (só o dono)
- **Menu ⚙ de configurações**: cor do layout (cinza, preto, branco, roxo, rosa, verde, vermelho, azul, laranja ou qualquer cor), nome e avatar, supressor de ruído e conta
- **Supressor de ruído** (RNNoise) que tira barulho de fundo do microfone
- A transmissão **não abre sozinha**: cada um clica em **Assistir**
- **Mensagens diretas** entre as contas, mesmo fora da chamada (quem estiver offline recebe quando entrar)
- **Amigos**: pedir, aceitar e desfazer amizade; entre amigos na chamada: **🍅 tomate** e **👊 chamar atenção** (1 vez a cada 2 minutos)
- **Emojis** (mais de 700) e **GIFs** (KLIPY) no chat do canal e nas mensagens

- **Perfil** com nome e foto: 21 personagens prontos ou sua própria foto (clique na sua foto, embaixo à esquerda, para trocar)
- **Trocar nome do canal** (dono e moderadores): passe o mouse no canal e clique no lápis ✏️
- **Volume separado de cada amigo**: clique no cartão do amigo; a transmissão tem o próprio controle de volume
- **Som** quando alguém entra ou sai da chamada
- **Marca d'água** com a logo King Launcher no fundo (some quando há transmissão na tela)

- Canais de voz com até **15 pessoas** em cada um
- Mutar o microfone e ensurdecer (parar de ouvir)
- Contorno verde em **quem está falando**
- **Compartilhamento de tela**, com o som do sistema quando o navegador permite
- **Várias transmissões ao mesmo tempo**: cada pessoa escolhe o que assistir (botão **Assistir**) e pode ver várias lado a lado; quem transmite só envia o vídeo para quem está assistindo
- Tela cheia na transmissão
- A barra lateral mostra quem está em cada canal, quem está mutado e quem está **AO VIVO**

O áudio e a tela vão **direto entre os navegadores** (WebRTC peer-to-peer).
O servidor só faz a "apresentação" entre as pessoas, por isso é bem leve.

---

## 1. Rodar no seu computador (teste)

Você precisa ter o **Node.js 18 ou mais novo** instalado (https://nodejs.org).

```bash
cd voz-app
npm install
npm start
```

1. Abra **http://localhost:3000** em duas abas ou em dois navegadores diferentes.
2. Digite um nome em cada um e clique no canal **Geral**.
3. Para evitar eco no teste, use fone de ouvido.

## 2. Testar com amigos rapidamente (sem servidor)

O microfone só funciona em **https** (ou em localhost). O jeito mais rápido de gerar um
endereço https é o **Cloudflare Tunnel**, que é grátis:

```bash
# com o app rodando (npm start), em outro terminal:
cloudflared tunnel --url http://localhost:3000
```

Ele mostra um link como `https://algo-aleatorio.trycloudflare.com`. Mande esse link
para os amigos. Para instalar o cloudflared:
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

> Sem um servidor TURN (próxima seção), algumas pessoas podem não conectar,
> principalmente em internet móvel ou em provedores com CGNAT.

## 3. Colocar no ar de verdade (VPS)

Uma VPS simples (1 vCPU, 1 GB de RAM) aguenta tranquilamente.

### 3.1 App + HTTPS com Caddy
```bash
# na VPS (Ubuntu)
sudo apt install -y nodejs npm caddy
cd voz-app && npm install
PORT=3000 node server.js     # ou use pm2: npm i -g pm2 && pm2 start server.js --name voz
```

Arquivo `/etc/caddy/Caddyfile` (o Caddy gera o certificado https sozinho):
```
voz.seudominio.com {
    reverse_proxy localhost:3000
}
```
Depois rode `sudo systemctl reload caddy`.

### 3.2 Servidor TURN (coturn): recomendado
O TURN garante a conexão de quem está atrás de uma rede restrita.
```bash
sudo apt install -y coturn
```
Arquivo `/etc/turnserver.conf`:
```
listening-port=3478
fingerprint
lt-cred-mech
user=voz:UMA_SENHA_FORTE
realm=voz.seudominio.com
external-ip=IP_PUBLICO_DA_VPS
min-port=49160
max-port=49200
no-cli
```
Em seguida, ative o serviço com `sudo systemctl enable --now coturn` e libere no firewall
as portas **3478 (TCP e UDP)** e **49160-49200/UDP**.

Inicie o app apontando para o TURN:
```bash
TURN_URL="turn:voz.seudominio.com:3478?transport=udp,turn:voz.seudominio.com:3478?transport=tcp" \
TURN_USER=voz TURN_PASS=UMA_SENHA_FORTE \
PORT=3000 node server.js
```

---

## Configurações (variáveis de ambiente)

| Variável | Padrão | O que faz |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `CHANNELS` | `Geral,Sala 2,Sala 3` | Nomes dos canais, separados por vírgula |
| `MAX_PER_CHANNEL` | `15` | Limite de pessoas por canal |
| `TURN_URL` / `TURN_USER` / `TURN_PASS` | vazio | Servidor TURN |

Exemplo: `CHANNELS="Lobby,Jogos,Reunião" npm start`

## Qualidade da tela

A transmissão vai em até 1080p e 30 fps, limitada a ~2,5 Mbps por pessoa.
Com 5 espectadores, quem transmite precisa de ~12 Mbps de upload.
Se a internet for mais fraca, edite em `public/app.js`:
- `maxBitrate: 2_500_000`: diminua, por exemplo, para `1_200_000`
- `width: { max: 1920 }, height: { max: 1080 }`: troque por 1280 × 720

Para jogos ou vídeos (movimento rápido), troque `vt.contentHint = 'detail'` por `'motion'`.

## Limitações
- Compartilhar a tela funciona no **Chrome, Edge e Firefox no computador**. No celular dá
  para entrar, falar e assistir, mas não transmitir.
- O **som do sistema** junto com a tela só funciona no Chrome/Edge. No Windows ele pega
  o som do sistema inteiro; no Mac, só o som de uma aba.
- Não há login nem senha: qualquer pessoa com o link entra. Se precisar, dá para adicionar
  uma senha de acesso.

## Estrutura
```
server.js          servidor de sinalização (Express + Socket.IO)
public/index.html  interface
public/style.css   visual estilo Discord
public/app.js      WebRTC: voz, tela, mute, indicador de fala
```


---

## Contas (login) — banco de dados grátis Neon

As contas ficam guardadas no **Neon** (Postgres grátis, sem cartão).
Sem ele, as contas ficam só na memória e **somem quando o Render reinicia**.

1. Entre em **https://neon.com**, clique em **Sign up** e entre com o GitHub.
2. Crie um projeto (qualquer nome, ex.: `king-launcher`) e deixe a região que ele sugerir.
3. Na tela do projeto, clique em **Connect** e copie o endereço que começa com `postgresql://`.
4. No **Render**, abra o serviço → **Environment** → **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: cole o endereço do Neon
5. Clique em **Save, rebuild and deploy**.
6. Assim que publicar, **crie a sua conta primeiro**: a primeira conta criada vira a do **dono**.

Variável opcional: `SESSION_SECRET` (qualquer texto longo) para assinar os logins.
Sem ela, o servidor usa uma chave derivada do `DATABASE_URL`.

Créditos: supressor de ruído RNNoise (Xiph.Org/Mozilla, licença BSD) via
@sapphi-red/web-noise-suppressor (licença MIT) — veja `public/vendor/supressor/LICENSE.txt`.


## GIFs (KLIPY) — opcional

O Google desligou o Tenor em junho de 2026; os GIFs usam a **KLIPY** (grátis).

1. Entre em **https://klipy.com/developers**, crie uma conta e gere uma **API key** no painel.
2. No **Render** → **Environment** → **Add Environment Variable**: Key `KLIPY_KEY`, Value: a chave.
3. **Save, rebuild and deploy**.

Sem a chave, o botão de GIF mostra um aviso e o resto funciona normalmente.
A chave de teste da KLIPY permite 100 buscas por hora (para o grupo inteiro);
para tirar o limite, peça a chave de produção no painel deles (também grátis).
