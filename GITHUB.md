# Enviar somente o site ao GitHub

1. No GitHub, crie um repositório vazio, sem README, `.gitignore` ou licença.
2. Abra a pasta `juridico-processos` no Explorador de Arquivos.
3. Dê dois cliques em `publicar-no-github.bat`.
4. Cole a URL HTTPS do repositório, por exemplo: `https://github.com/seu-usuario/portal-juridico.git`.
5. Quando terminar, importe esse repositório na Vercel.

O script ignora automaticamente `.env`, `node_modules`, bancos SQLite, logs e uploads. Nunca envie o arquivo `.env` para o GitHub.
