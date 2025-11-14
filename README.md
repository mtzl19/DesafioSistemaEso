# VShop – Simulador de Loja de Cosméticos Fortnite

Projeto full stack desenvolvido por **Matheus Santos (mathegabr@gmail.com)** como exercício técnico para o processo seletivo de **Desenvolvedor(a) Web Júnior**.

A aplicação é um simulador de e-commerce que acessa a **API pública do Fortnite** para listar cosméticos do jogo.
O sistema permite que usuários se cadastrem, gerenciem seu saldo de V-Bucks, comprem e devolvam itens, além de explorarem as coleções de outros membros da comunidade.

---

## ✨ Funcionalidades

- **Autenticação de Usuários:** Cadastro e Login com JWT para segurança das rotas.
- **Loja de Itens:**
  - Visualização de cosméticos da API do Fortnite.
  - Sistema de filtros avançados (nome, raridade, tipo, data, etc.).
  - Paginação com "Carregar Mais".
- **Sistema de E-commerce:**
  - Compra de itens e pacotes (bundles) com saldo virtual (V-Bucks).
  - Devolução de itens com reembolso.
  - Recarga de V-Bucks.
- **Área do Usuário:**
  - Visualização da coleção de itens adquiridos ("Minha Coleção").
  - Histórico detalhado de transações (compras, devoluções).
  - Edição de dados do perfil (nome de usuário, e-mail, senha).
- **Comunidade:**
  - Ranking dos maiores colecionadores (pódio).
  - Lista paginada de todos os usuários e suas coleções.
  - Visualização do perfil público de outros usuários.
- **Recurso de Desenvolvimento:** Rota de *seeding* para popular o banco de dados com usuários de teste.

---
## 🛠️ Tecnologias Utilizadas

### Frontend (`/client`)

- **React.js (Vite)**
- **React Hooks:** `useState`, `useEffect`, `useRef`
- **Estilização (CSS-in-JS)**
- **React Toastify**

### Backend (`/api`)

- **Node.js**
- **Express.js**
- **PostgreSQL**
- **pg (node-postgres)**
- **JWT**
- **bcrypt.js**
- **Axios**

### DevOps

- **Docker & Docker Compose** para containerização e orquestração dos serviços.
- **Git** para controle

---

## 📂 Estrutura do Projeto

```
/
├── api/         # Backend Node.js/Express
├── client/      # Frontend React.js
├── docker-compose.yml
└── README.md
```

---

## 🚀 Rodando o Projeto com Docker

Este método constrói e executa o frontend, o backend e o banco de dados automaticamente, sendo a forma mais simples de executar a aplicação.

**Pré-requisitos:**
- Docker
- Git

**Passos:**
```bash
# 1. Clone o repositório
git clone https://github.com/mtzl19/DesafioSistemaEso.git
cd DesafioSistemaEso

# 2. Suba os contêineres
docker-compose up --build
```

A aplicação estará disponível em `http://localhost:5173`.