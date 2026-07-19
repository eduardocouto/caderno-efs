#!/usr/bin/env node
// decrypt.js — valida que o payload do index.html decifra com a password dada.
// Uso: node decrypt.js <password>
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const password = process.argv[2];
if (!password) { console.error("Uso: node decrypt.js <password>"); process.exit(1); }

const gate = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = gate.match(/var PAYLOAD = "([^"]+)"/);
if (!m) { console.error("ERRO: payload não encontrado no index.html"); process.exit(1); }

const data = Buffer.from(m[1], "base64");
const salt = data.subarray(0, 16), iv = data.subarray(16, 28);
const tag = data.subarray(data.length - 16), ct = data.subarray(28, data.length - 16);
const key = crypto.pbkdf2Sync(password, salt, 250000, 32, "sha256");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
try {
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  const ok = plain.startsWith("<!DOCTYPE html>") && plain.includes("Caderno de Projeto") && plain.includes("data:image/jpeg;base64,");
  console.log("Decifragem OK — " + plain.length + " chars, validações: " + (ok ? "PASSA" : "FALHA"));
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.error("ERRO: decifragem falhou (password errada ou payload corrompido)");
  process.exit(1);
}
