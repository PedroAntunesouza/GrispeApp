# API da confeitaria

API REST em TypeScript, Node.js e Express para o GrispeApp. O banco MySQL é
inicializado executando [`schema.sql`](./schema.sql). Copie `.env.example` para
`.env`, ajuste as credenciais e execute:

```bash
npm install
npm run build
npm start
```

Os módulos implementados seguem o artigo: usuários, ingredientes e
movimentações auditadas, receitas com ficha técnica, pedidos com baixa
automática de estoque e lançamento de receita, além do painel financeiro com
CMV e alertas para as faixas de 25% e 30%.
