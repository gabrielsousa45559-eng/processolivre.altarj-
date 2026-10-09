# Publicar no Render ou Vercel

## Render

O arquivo `render.yaml` prepara o serviço automaticamente. Ao criar o serviço, informe somente:

- `NEXTAUTH_URL`: a URL final do serviço, por exemplo `https://portal-juridico.onrender.com`;
- `ADMIN_PASSWORD`: sua senha de administrador;
- `OPENROUTER_API_KEY`: opcional, necessária apenas para a IA.

O portal usa Prisma Postgres para que os dados não dependam do computador nem sejam apagados quando o Render reiniciar.

1. Crie uma conta em [Prisma Console](https://console.prisma.io/login) e um projeto.
2. Escolha **Create Database** (Prisma Postgres).
3. Em **Connection Strings**, gere ou copie a URL do banco.
4. No Render → **Environment**, configure somente `DATABASE_URL` com essa URL.
5. Faça um novo deploy. O comando de build cria as tabelas e o administrador automaticamente.

Use a string fornecida pelo Prisma, sem montar endereço manualmente. Ela precisa começar com `postgres://` ou `postgresql://`.

## Vercel

No projeto da Vercel, abra **Settings → Build and Deployment → Root Directory** e escolha `juridico-processos`. Salve e faça **Redeploy**. Sem isso, a Vercel tenta compilar o bot Discord na raiz e mostra o erro “Could not find any `pages` or `app` directory”.

Em **Environment Variables**, configure `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_NAME`, `ADMIN_ID`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` e `CRON_SECRET`.

Para Vercel, use PostgreSQL (por exemplo, Neon ou Supabase) no `DATABASE_URL`. SQLite e a pasta `public/uploads` servem para teste local/VPS, mas não mantêm dados ou uploads de modo confiável em funções serverless.

No plano Hobby da Vercel, o cron de prazos roda uma vez por dia, às 09:00 UTC, em `/api/deadlines`. Para conferência de prazo de hora em hora, use Vercel Pro ou um agendador externo.
