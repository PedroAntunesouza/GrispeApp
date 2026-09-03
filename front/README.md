# GrispeApp

Aplicativo mobile para gestão de uma confeitaria artesanal. O app usa
React Native com Expo Go e consome a API REST Node.js do diretório
[`../backend`](../backend).

## Testar no Expo Go

### 1. Pré-requisitos

- Node.js instalado;
- MySQL instalado e em execução;
- Expo Go instalado no celular;
- computador e celular conectados à mesma rede Wi-Fi.

### 2. Preparar o banco e a API

No MySQL, execute [`../backend/schema.sql`](../backend/schema.sql). Depois crie
`backend/.env` a partir de [`../backend/.env.example`](../backend/.env.example)
e informe a senha do MySQL.

Em um terminal:

```powershell
cd "C:\Users\peant\OneDrive\Documentos\coisas pedro\Faculdade\Projeto TCC\GrispeApp\backend"
npm install
npm start
```

Teste no navegador do computador: `http://localhost:8081/health`. A resposta
esperada é `{"status":"ok"}`.

### 3. Configurar o IP para o celular

Descubra o IPv4 do computador executando `ipconfig` no PowerShell. Use o
endereço da placa que está conectada à mesma rede do celular, por exemplo
`192.168.0.10`.

Na pasta `front`, copie `.env.example` para `.env.local` e altere:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8081
```

O endereço é configurado somente em
[`front/.env.local`](./.env.local), que não deve ser commitado. O arquivo
[`front/service/api.js`](./service/api.js) lê essa variável e centraliza todas
as chamadas para a API.

### 4. Abrir no Expo Go

Em outro terminal:

```powershell
cd "C:\Users\peant\OneDrive\Documentos\coisas pedro\Faculdade\Projeto TCC\GrispeApp\front"
npm install
npx expo start --clear
```

Escaneie o QR Code com o Expo Go. Se a conexão LAN não funcionar, execute
`npx expo start --tunnel`.

## Organização do projeto

- `app/login.tsx`: login e cadastro.
- `app/(tabs)/estoque.tsx`: ingredientes, níveis mínimos e movimentações.
- `app/(tabs)/receitas.tsx`: fichas técnicas e ingredientes por receita.
- `app/(tabs)/pedidos.tsx`: pedidos, status, cálculo de custo e baixa de estoque.
- `app/(tabs)/financeiro.tsx`: receitas, despesas, fluxo de caixa e CMV.
- `app/(tabs)/_layout.tsx`: navegação entre os módulos.
- `service/api.js`: cliente HTTP usado pelo app.
- `lib/app-theme.tsx`: tema claro/escuro persistido localmente.
- `backend/src/server.ts`: rotas e regras da API.
- `backend/src/db.ts`: conexão com MySQL.
- `backend/schema.sql`: tabelas do sistema.

## Fluxo principal

O usuário cria uma conta ou entra. Ingredientes são cadastrados com unidade,
quantidade, estoque mínimo e custo unitário. As receitas relacionam os
ingredientes e suas quantidades. Ao registrar um pedido, a API calcula o custo
com base na ficha técnica, verifica o estoque, baixa os insumos em uma
transação e registra a receita financeira. O financeiro calcula o CMV usando o
custo e o valor dos pedidos.
