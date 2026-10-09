@echo off
setlocal
cd /d "%~dp0"
title Publicar Portal Juridico no GitHub

where git >nul 2>&1
if errorlevel 1 (
  echo Git nao foi encontrado neste computador.
  echo Instale em: https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist .git (
  git init
  git branch -M main
)

echo.
echo Este envio inclui somente o Portal Juridico.
echo Senhas, banco local, node_modules e uploads nao serao enviados.
echo.
set /p REPO_URL=Cole a URL HTTPS do repositorio vazio do GitHub: 

if "%REPO_URL%"=="" (
  echo Nenhuma URL foi informada.
  pause
  exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)

git add .
git commit -m "Portal juridico de processos"
git push -u origin main

if errorlevel 1 (
  echo.
  echo O GitHub recusou o envio. Confira se a URL esta certa e faca login quando o Git pedir.
  pause
  exit /b 1
)

echo.
echo Publicacao concluida. Agora importe este repositorio na Vercel.
pause
endlocal
