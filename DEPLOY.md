# Publicar na Vercel

No projeto da Vercel, abra **Settings → Build and Deployment → Root Directory** e escolha `juridico-processos`. Salve e faça **Redeploy**. Sem isso, a Vercel tenta compilar o bot Discord na raiz e mostra o erro “Could not find any `pages` or `app` directory”.

Em **Environment Variables**, configure `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_NAME`, `ADMIN_ID`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` e `CRON_SECRET`.

Para Vercel, use PostgreSQL (por exemplo, Neon ou Supabase) no `DATABASE_URL`. SQLite e a pasta `public/uploads` servem para teste local/VPS, mas não mantêm dados ou uploads de modo confiável em funções serverless.

O cron de prazos roda a cada hora em `/api/deadlines`.
