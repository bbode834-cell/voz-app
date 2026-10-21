# King Laucher — Canais de Voz com Compartilhamento de Tela

App parecido com o Discord, para grupos pequenos:

- **Perfil** com nome e foto: 21 personagens prontos ou sua própria foto (clique na sua foto, embaixo à esquerda, para trocar)
- **Trocar nome do canal**: passe o mouse no canal e clique no lápis ✏️
- **Volume separado de cada amigo**: clique no cartão do amigo; a transmissão tem o próprio controle de volume
- **Som** quando alguém entra ou sai da chamada
- **Marca d'água** com a logo King Laucher no fundo

- Canais de voz com até **6 pessoas** em cada um
- Mutar o microfone e ensurdecer (parar de ouvir)
- Contorno verde em **quem está falando**
- **Compartilhamento de tela**, com o som do sistema quando o navegador permite
- **Uma transmissão por vez**: enquanto alguém transmite, o botão fica bloqueado para os outros
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
| `MAX_PER_CHANNEL` | `6` | Limite de pessoas por canal |
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
