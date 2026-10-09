@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
  if errorlevel 1 goto :error
)
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Arquivo .env criado. Ajuste as senhas e chaves antes de usar em producao.
)
call npx prisma generate
if errorlevel 1 goto :error
call npx prisma db push
if errorlevel 1 goto :error
call npm run db:seed
if errorlevel 1 goto :error
start "Portal Juridico" http://localhost:3000/login
call npm run dev
goto :end
:error
echo.
echo Nao foi possivel iniciar o Portal Juridico. Leia o erro acima.
pause
:end
endlocal
