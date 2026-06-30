# 🚀 Guia de Deploy - StudyDino

## Pré-requisitos
- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com)
- Conta no [Render](https://render.com)

---

## 📝 Passo 1: Preparar repositório GitHub

1. Crie um repositório no GitHub
2. Faça push do código:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

---

## 🗄️ Passo 2: Deploy do Backend + Database (Render)

### 2.1 Criar Database PostgreSQL

1. Acesse [render.com](https://render.com)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Preencha:
   - **Name**: `studydino-db`
   - **Database**: `studydino`
   - **User**: `postgres`
4. Clique em **"Create Database"**
5. **Copie a URL da conexão** (Connection String)

### 2.2 Deploy do Backend

1. Em Render, clique em **"New +"** → **"Web Service"**
2. Selecione seu repositório GitHub
3. Preencha:
   - **Name**: `studydino-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Vá em **"Environment"** e adicione:
   - `DATABASE_URL`: Cole a URL do PostgreSQL (copie no passo anterior)
   - `JWT_SECRET`: Gere uma senha segura (ex: `openssl rand -hex 32`)
5. Clique em **"Create Web Service"**
6. **Copie a URL do serviço** (ex: `https://studydino-api.onrender.com`)

---

## 🎨 Passo 3: Deploy do Frontend (Vercel)

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Selecione seu repositório
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Vá em **"Environment Variables"** e adicione:
   - **Name**: `VITE_API_URL`
   - **Value**: Cole a URL do Render (ex: `https://studydino-api.onrender.com/api`)
6. Clique em **"Deploy"**

---

## ✅ Testes Finais

1. Acesse a URL do Vercel (seu site ao vivo)
2. Teste criar conta
3. Teste fazer login
4. Teste criar matérias e trilhas

---

## 🔄 Fazer atualizações

Depois que está deployado, qualquer push para `main` no GitHub:
- **Vercel** reconstrói e deploya o frontend automaticamente
- **Render** reconstrói e deploya o backend automaticamente

```bash
git add .
git commit -m "Nova feature"
git push origin main
```

---

## 📌 Notas Importantes

- ⚠️ No plano gratuito do Render, o backend **dorme após 15 min de inatividade**. Primeira requisição leva ~30s para acordar.
- 💾 Banco PostgreSQL gratuito tem **limite de 256MB**
- 🔐 Nunca coloque JWT_SECRET no código, use Environment Variables

---

## 🆘 Troubleshooting

**"Connection refused" no frontend?**
- Verifique se `VITE_API_URL` está correto em Vercel
- Certifique-se que o backend está rodando em Render

**"Erro de autenticação no banco?**
- Verifique `DATABASE_URL` está correto em Render
- Teste a conexão copiando a URL no terminal

**Primeira requisição está lenta?**
- Normal! O Render coloca em sleep após inatividade
- Use um service like UptimeRobot para manter "acordado"
