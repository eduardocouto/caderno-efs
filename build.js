#!/usr/bin/env node
// build.js — embebe as imagens em content.html e cifra o resultado para index.html.
// Uso: node build.js <password>
// AES-256-GCM, chave por PBKDF2-SHA256 (250 000 iter.) — mesmo padrão do gate da cronologia/EFS.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const password = process.argv[2];
if (!password) { console.error("Uso: node build.js <password>"); process.exit(1); }

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, "content.html"), "utf8");

const b64 = f => fs.readFileSync(path.join(dir, "assets", f)).toString("base64");
html = html.replace("{{IMG_HERO}}", "data:image/jpeg;base64," + b64("hero.jpg"))
  .replace("{{IMG_QUARTO}}", "data:image/jpeg;base64," + b64("quarto.jpg"))
  .replace("{{PDF_B64}}", b64("documento.pdf"));
if (/\{\{(IMG_|PDF_)/.test(html)) { console.error("ERRO: placeholder por substituir"); process.exit(1); }

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, 250000, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(Buffer.from(html, "utf8")), cipher.final(), cipher.getAuthTag()]);
const payload = Buffer.concat([salt, iv, ct]).toString("base64");

const gate = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entre a Forma e o Silêncio — Caderno de Projeto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,500;1,400&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: #FAF8F3; color: #1C1A17; font-family: 'Archivo', sans-serif; }
  .wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .card { width: 100%; max-width: 420px; border: 1px solid #1C1A17; padding: 48px 40px; background: #FAF8F3; text-align: center; }
  .kicker { font-size: 10px; font-weight: 500; letter-spacing: 0.24em; text-transform: uppercase; color: #6B4423; }
  h1 { margin: 16px 0 6px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 30px; line-height: 1.2; }
  .sub { margin: 0 0 32px 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #6B4423; }
  input { width: 100%; box-sizing: border-box; padding: 12px 14px; font-family: 'Archivo', sans-serif; font-size: 15px; border: 1px solid #1C1A17; background: #FFFFFF; color: #1C1A17; outline: none; text-align: center; letter-spacing: 0.08em; }
  input:focus { border-color: #4A1D1A; }
  button { width: 100%; margin-top: 12px; padding: 12px 14px; font-family: 'Archivo', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; background: #1C1A17; color: #FAF8F3; border: 1px solid #1C1A17; cursor: pointer; }
  button:hover { background: #4A1D1A; border-color: #4A1D1A; }
  button:disabled { opacity: 0.5; cursor: wait; }
  .err { min-height: 18px; margin-top: 14px; font-size: 12px; color: #4A1D1A; }
  .foot { margin-top: 28px; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(28,26,23,0.45); }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="kicker">Caderno de projeto · Alentejo · 2026</div>
    <h1>Entre a Forma e o Silêncio</h1>
    <p class="sub">Acesso reservado</p>
    <form id="f">
      <input id="pw" type="password" autocomplete="current-password" placeholder="Palavra-passe" autofocus>
      <button id="go" type="submit">Entrar</button>
    </form>
    <div class="err" id="err"></div>
    <div class="foot">Documento vivo · Edição protegida</div>
  </div>
</div>
<script>
var PAYLOAD = "${payload}";
var SS_KEY = "efs-caderno-pw";
function b64ToBytes(b64) {
  var bin = atob(b64), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function decrypt(password) {
  var data = b64ToBytes(PAYLOAD);
  var salt = data.slice(0, 16), iv = data.slice(16, 28), ct = data.slice(28);
  var keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  var key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
  return new TextDecoder().decode(plain);
}
async function unlock(password, silent) {
  var btn = document.getElementById("go"), err = document.getElementById("err");
  btn.disabled = true; err.textContent = "";
  try {
    var html = await decrypt(password);
    try { sessionStorage.setItem(SS_KEY, password); } catch (e) {}
    document.open(); document.write(html); document.close();
  } catch (e) {
    btn.disabled = false;
    if (!silent) { err.textContent = "Palavra-passe incorreta."; document.getElementById("pw").select(); }
    else { try { sessionStorage.removeItem(SS_KEY); } catch (e2) {} }
  }
}
document.getElementById("f").addEventListener("submit", function (ev) {
  ev.preventDefault();
  var pw = document.getElementById("pw").value;
  if (pw) unlock(pw, false);
});
(function () {
  try {
    var saved = sessionStorage.getItem(SS_KEY);
    if (saved) unlock(saved, true);
  } catch (e) {}
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, "index.html"), gate);
console.log("index.html escrito: " + gate.length + " bytes (payload " + payload.length + " b64)");
