# Caderno de Projeto — Entre a Forma e o Silêncio

GitHub Pages com acesso por palavra-passe (cifragem client-side).

- `index.html` — gate + conteúdo cifrado (AES-256-GCM, PBKDF2-SHA256 250k iter.), gerado por `build.js`.
- Fonte de trabalho: `content.html` + `assets/` (não versionados — o repo é público e o conteúdo é reservado).
- Editar: alterar `content.html` → `node build.js <password>` → validar com `node decrypt.js <password>` → commit do `index.html`.
