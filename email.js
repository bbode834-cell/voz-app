// Envio de e-mails do TalKing (código de confirmação e recuperação de senha).
// Configuração no Render (variáveis de ambiente):
//   EMAIL_USUARIO = o Gmail que envia (ex.: talking.app@gmail.com)
//   BREVO_KEY     = chave de API do Brevo (o que funciona no Render grátis; ver abaixo)
//   EMAIL_SENHA   = (só em servidor pago) a "senha de app" de 16 letras do Gmail, enviando por SMTP
//   EMAIL_HOST    = (opcional) outro servidor SMTP; padrão smtp.gmail.com
//   EMAIL_NOME    = (opcional) nome que aparece como remetente; padrão "TalKing"
// Sem EMAIL_USUARIO/EMAIL_SENHA o site funciona normalmente, só sem os recursos de e-mail.
const nodemailer = require('nodemailer');

const USUARIO = process.env.EMAIL_USUARIO || '';
const SENHA = process.env.EMAIL_SENHA || '';
const HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const NOME = process.env.EMAIL_NOME || 'TalKing';
// Render grátis bloqueia as portas de e-mail (SMTP). Por isso o jeito que funciona lá é a API do Brevo
// (HTTP, grátis até 300 e-mails/dia): BREVO_KEY = chave de API v3; o remetente é EMAIL_USUARIO (validado no Brevo).
const BREVO_KEY = process.env.BREVO_KEY || '';
const TESTE = !!process.env.EMAIL_TESTE; // nos testes, nada é enviado: fica guardado em memória
const ativo = TESTE || !!(USUARIO && (SENHA || BREVO_KEY));
const caixaTeste = [];

const PORTA = Number(process.env.EMAIL_PORTA) || 465; // 465 (SSL) ou 587 (STARTTLS)
let transporte = null;
function criaTransporte(porta) {
  return nodemailer.createTransport({
    host: HOST,
    port: porta,
    secure: porta === 465,
    auth: { user: USUARIO, pass: SENHA.replace(/\s+/g, '') },
    // sem isso, se a porta estiver bloqueada o site fica travado esperando por minutos
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}
async function enviaBrevo(para, assunto, html, texto) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { name: NOME, email: USUARIO }, to: [{ email: para }], subject: assunto, htmlContent: html, textContent: texto }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg += ` ${j.message || j.code || ''}`; } catch {}
    throw new Error(`Brevo: ${msg}`);
  }
}
if (ativo && !TESTE && BREVO_KEY) {
  // Confere a chave ao ligar (sem mandar nada)
  fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': BREVO_KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) })
    .then(async (r) => { if (r.ok) { const j = await r.json(); console.log(`E-mail: pronto pelo Brevo (conta ${j.email || ''}, remetente ${USUARIO})`); } else console.error(`E-mail: o Brevo recusou a chave (HTTP ${r.status}). Confira BREVO_KEY.`); })
    .catch((e) => console.error('E-mail: não consegui falar com o Brevo —', e.message));
} else if (ativo && !TESTE) {
  transporte = criaTransporte(PORTA);
  // Testa a conexão ao ligar e escreve no log (pra ver no Render se o Gmail aceitou)
  transporte.verify().then(() => console.log(`E-mail: pronto (${HOST}:${PORTA}, ${USUARIO})`)).catch(async (e) => {
    console.error(`E-mail: falhou em ${HOST}:${PORTA} — ${e.message}`);
    const outra = PORTA === 465 ? 587 : 465;
    const t2 = criaTransporte(outra);
    try { await t2.verify(); transporte = t2; console.log(`E-mail: pronto pela porta ${outra} (${USUARIO})`); }
    catch (e2) { console.error(`E-mail: também falhou em ${HOST}:${outra} — ${e2.message}. Confira EMAIL_USUARIO / EMAIL_SENHA (senha de app de 16 letras) e se o Render deixa sair por 465/587.`); }
  });
}

const emailValido = (e) => typeof e === 'string' && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const limpaEmail = (e) => String(e || '').trim().toLowerCase();

function layout(titulo, corpo) {
  return `<!doctype html><html><body style="margin:0;background:#0b0826;font-family:Arial,Helvetica,sans-serif;color:#e8e6ff">
  <div style="max-width:480px;margin:0 auto;padding:28px 20px">
    <div style="background:#15113a;border:1px solid #2d2766;border-radius:16px;padding:26px 24px">
      <div style="font-size:26px;font-weight:800;letter-spacing:.5px;margin-bottom:6px"><span style="color:#fff">Tal</span><span style="color:#22d3ee">King</span> 👑</div>
      <h2 style="margin:0 0 12px;font-size:19px;color:#fff">${titulo}</h2>
      ${corpo}
      <p style="margin:18px 0 0;font-size:12px;color:#9a95c9">Se não foi você, pode ignorar este e-mail. O código vale por 15 minutos.</p>
    </div>
  </div></body></html>`;
}
const caixaCodigo = (codigo) => `<div style="margin:16px 0;text-align:center"><span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:8px;color:#0b0826;background:#22d3ee;border-radius:12px;padding:12px 20px">${codigo}</span></div>`;

async function envia(para, assunto, html, texto) {
  if (TESTE) { caixaTeste.push({ para, assunto, texto, html, em: Date.now() }); return; }
  if (!ativo) throw new Error('E-mail não configurado (EMAIL_USUARIO + BREVO_KEY ou EMAIL_SENHA).');
  if (BREVO_KEY) return enviaBrevo(para, assunto, html, texto);
  await transporte.sendMail({ from: `"${NOME}" <${USUARIO}>`, to: para, subject: assunto, text: texto, html });
}

// Código pra confirmar que o e-mail é da pessoa
function enviaConfirmacao(para, nome, codigo) {
  return envia(para, `${codigo} é o seu código do TalKing`,
    layout('Confirme seu e-mail', `<p style="margin:0;font-size:15px;line-height:1.5">Oi, <b>${nome}</b>! Digite este código no TalKing para confirmar seu e-mail:</p>${caixaCodigo(codigo)}`),
    `Oi, ${nome}! Seu código de confirmação do TalKing é ${codigo} (vale 15 minutos).`);
}

// Código pra criar uma senha nova
function enviaRecuperacao(para, nome, codigo) {
  return envia(para, `${codigo} — recuperar sua senha do TalKing`,
    layout('Recuperar a senha', `<p style="margin:0;font-size:15px;line-height:1.5">Oi, <b>${nome}</b>! Alguém pediu para trocar a senha da sua conta. Digite este código no TalKing para criar uma senha nova:</p>${caixaCodigo(codigo)}`),
    `Oi, ${nome}! Seu código para criar uma senha nova no TalKing é ${codigo} (vale 15 minutos).`);
}

module.exports = { ativo, caixaTeste, emailValido, limpaEmail, enviaConfirmacao, enviaRecuperacao, _envia: envia };
