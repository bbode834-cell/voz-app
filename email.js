// Envio de e-mails do TalKing (código de confirmação e recuperação de senha).
// Configuração no Render (variáveis de ambiente):
//   EMAIL_USUARIO = o Gmail que envia (ex.: talking.app@gmail.com)
//   EMAIL_SENHA   = a "senha de app" de 16 letras gerada no Google (não é a senha normal)
//   EMAIL_HOST    = (opcional) outro servidor SMTP; padrão smtp.gmail.com
//   EMAIL_NOME    = (opcional) nome que aparece como remetente; padrão "TalKing"
// Sem EMAIL_USUARIO/EMAIL_SENHA o site funciona normalmente, só sem os recursos de e-mail.
const nodemailer = require('nodemailer');

const USUARIO = process.env.EMAIL_USUARIO || '';
const SENHA = process.env.EMAIL_SENHA || '';
const HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const NOME = process.env.EMAIL_NOME || 'TalKing';
const TESTE = !!process.env.EMAIL_TESTE; // nos testes, nada é enviado: fica guardado em memória
const ativo = TESTE || !!(USUARIO && SENHA);
const caixaTeste = [];

let transporte = null;
if (ativo && !TESTE) {
  transporte = nodemailer.createTransport({
    host: HOST,
    port: 465,
    secure: true,
    auth: { user: USUARIO, pass: SENHA.replace(/\s+/g, '') },
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
  if (!ativo) throw new Error('E-mail não configurado (EMAIL_USUARIO / EMAIL_SENHA).');
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
