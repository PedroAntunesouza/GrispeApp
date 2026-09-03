import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const asyncRoute = (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/ingredientes', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, nome, unidade_medida AS unidadeMedida, quantidade_atual AS quantidadeAtual, estoque_minimo AS estoqueMinimo, preco_unitario AS precoUnitario FROM ingrediente WHERE ativo = 1 ORDER BY nome');
  res.json(rows);
}));

app.post('/api/ingredientes', asyncRoute(async (req, res) => {
  const { nome, unidadeMedida, quantidadeAtual = 0, estoqueMinimo = 0, precoUnitario = 0 } = req.body;
  if (!nome?.trim() || Number(quantidadeAtual) < 0 || Number(estoqueMinimo) < 0 || Number(precoUnitario) < 0) {
    res.status(400).json({ message: 'Informe dados válidos para o ingrediente.' });
    return;
  }
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO ingrediente (nome, unidade_medida, quantidade_atual, estoque_minimo, preco_unitario) VALUES (?, ?, ?, ?, ?)',
    [nome.trim(), unidadeMedida?.trim() || 'un', quantidadeAtual, estoqueMinimo, precoUnitario],
  );
  res.status(201).json({ id: result.insertId, nome: nome.trim(), unidadeMedida: unidadeMedida?.trim() || 'un', quantidadeAtual, estoqueMinimo, precoUnitario });
}));

app.post('/api/ingredientes/:id/movimentacao', asyncRoute(async (req, res) => {
  const { tipo = 'ENTRADA', quantidade, motivo = 'Movimentação manual' } = req.body;
  const amount = Number(quantidade);
  if (!['ENTRADA', 'SAIDA'].includes(tipo) || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ message: 'Tipo e quantidade de movimentação inválidos.' });
    return;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT quantidade_atual FROM ingrediente WHERE id = ? AND ativo = 1 FOR UPDATE', [req.params.id]);
    const ingredient = rows[0];
    if (!ingredient) {
      res.status(404).json({ message: 'Ingrediente não encontrado.' });
      await connection.rollback();
      return;
    }
    const nextAmount = Number(ingredient.quantidade_atual) + (tipo === 'ENTRADA' ? amount : -amount);
    if (nextAmount < 0) {
      res.status(409).json({ message: 'Quantidade insuficiente em estoque.' });
      await connection.rollback();
      return;
    }
    await connection.execute('UPDATE ingrediente SET quantidade_atual = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [nextAmount, req.params.id]);
    await connection.execute('INSERT INTO estoque_movimentacao (tipo, quantidade, motivo, ingrediente_id) VALUES (?, ?, ?, ?)', [tipo, amount, motivo, req.params.id]);
    await connection.commit();
    res.json({ id: Number(req.params.id), quantidadeAtual: nextAmount });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/receitas', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, nome, descricao, rendimento, tempo_preparo AS tempoPreparo FROM receita WHERE ativo = 1 ORDER BY nome');
  for (const recipe of rows) {
    const [ingredients] = await pool.execute('SELECT id, ingrediente_id AS ingredienteId, quantidade, unidade FROM receita_ingrediente WHERE receita_id = ?', [recipe.id]);
    recipe.ingredientes = ingredients;
  }
  res.json(rows);
}));

app.post('/api/receitas', asyncRoute(async (req, res) => {
  const { nome, descricao = '', rendimento = 1, tempoPreparo = 0, ingredientes } = req.body;
  if (!nome?.trim() || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    res.status(400).json({ message: 'Nome e pelo menos um ingrediente são obrigatórios.' });
    return;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>('INSERT INTO receita (nome, descricao, rendimento, tempo_preparo) VALUES (?, ?, ?, ?)', [nome.trim(), descricao, rendimento, tempoPreparo]);
    for (const item of ingredientes) {
      if (!Number.isInteger(Number(item.ingredienteId)) || Number(item.quantidade) <= 0) {
        throw new Error('Ingrediente ou quantidade inválidos.');
      }
      await connection.execute('INSERT INTO receita_ingrediente (receita_id, ingrediente_id, quantidade, unidade) VALUES (?, ?, ?, (SELECT unidade_medida FROM ingrediente WHERE id = ?))', [result.insertId, item.ingredienteId, item.quantidade, item.ingredienteId]);
    }
    await connection.commit();
    res.status(201).json({ id: result.insertId, nome: nome.trim(), descricao, ingredientes });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/pedidos', asyncRoute(async (_req, res) => {
  const [orders] = await pool.query<RowDataPacket[]>('SELECT id, cliente, data_pedido AS dataPedido, data_entrega AS dataEntrega, status, valor_total AS valorTotal, custo_total AS custoTotal, observacao FROM pedido ORDER BY data_pedido DESC');
  for (const order of orders) {
    const [items] = await pool.execute('SELECT id, receita_id AS receitaId, quantidade, valor_unitario AS precoVenda, subtotal FROM pedido_item WHERE pedido_id = ?', [order.id]);
    order.itens = items;
  }
  res.json(orders);
}));

app.post('/api/pedidos', asyncRoute(async (req, res) => {
  const { cliente, observacao = '', dataEntrega = null, itens } = req.body;
  if (!cliente?.trim() || !Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({ message: 'Cliente e pelo menos um item são obrigatórios.' });
    return;
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let total = 0;
    let cost = 0;
    const resolvedItems: Array<{ receitaId: number; quantidade: number; precoVenda: number; custo: number }> = [];
    for (const item of itens) {
      const quantity = Number(item.quantidade);
      const price = Number(item.precoVenda);
      const [recipes] = await connection.execute<RowDataPacket[]>('SELECT id FROM receita WHERE id = ? AND ativo = 1', [item.receitaId]);
      if (!recipes[0] || quantity <= 0 || price < 0) throw new Error('Item de pedido inválido.');
      const [ingredients] = await connection.execute<RowDataPacket[]>('SELECT ri.quantidade, i.preco_unitario AS precoUnitario FROM receita_ingrediente ri JOIN ingrediente i ON i.id = ri.ingrediente_id WHERE ri.receita_id = ?', [item.receitaId]);
      const itemCost = ingredients.reduce((sum, ingredient) => sum + Number(ingredient.quantidade) * Number(ingredient.precoUnitario), 0) * quantity;
      total += price * quantity;
      cost += itemCost;
      resolvedItems.push({ receitaId: Number(item.receitaId), quantidade: quantity, precoVenda: price, custo: itemCost });
    }
    for (const item of resolvedItems) {
      const [ingredients] = await connection.execute<RowDataPacket[]>(
        'SELECT ri.ingrediente_id AS ingredienteId, ri.quantidade, i.quantidade_atual AS quantidadeAtual FROM receita_ingrediente ri JOIN ingrediente i ON i.id = ri.ingrediente_id WHERE ri.receita_id = ? FOR UPDATE',
        [item.receitaId],
      );
      for (const ingredient of ingredients) {
        const consumed = Number(ingredient.quantidade) * item.quantidade;
        if (Number(ingredient.quantidadeAtual) < consumed) {
          throw new Error(`Estoque insuficiente para o ingrediente #${ingredient.ingredienteId}.`);
        }
        await connection.execute(
          'UPDATE ingrediente SET quantidade_atual = quantidade_atual - ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
          [consumed, ingredient.ingredienteId],
        );
        await connection.execute(
          'INSERT INTO estoque_movimentacao (tipo, quantidade, motivo, ingrediente_id) VALUES (?, ?, ?, ?)',
          ['SAIDA', consumed, 'Consumo do pedido', ingredient.ingredienteId],
        );
      }
    }
    const [orderResult] = await connection.execute<ResultSetHeader>('INSERT INTO pedido (cliente, data_entrega, status, valor_total, custo_total, observacao) VALUES (?, ?, ?, ?, ?, ?)', [cliente.trim(), dataEntrega, 'PENDENTE', total, cost, observacao]);
    for (const item of resolvedItems) {
      await connection.execute('INSERT INTO pedido_item (pedido_id, receita_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)', [orderResult.insertId, item.receitaId, item.quantidade, item.precoVenda, item.precoVenda * item.quantidade]);
    }
    await connection.execute('INSERT INTO lancamento_financeiro (tipo, categoria, descricao, valor, pedido_id) VALUES (?, ?, ?, ?, ?)', ['RECEITA', 'Vendas', `Pedido #${orderResult.insertId}`, total, orderResult.insertId]);
    await connection.commit();
    res.status(201).json({ id: orderResult.insertId, cliente: cliente.trim(), status: 'PENDENTE', valorTotal: total, custoTotal: cost, itens: resolvedItems });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.patch('/api/pedidos/:id/status', asyncRoute(async (req, res) => {
  const allowed = ['PENDENTE', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO'];
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (!allowed.includes(status)) {
    res.status(400).json({ message: 'Status de pedido inválido.' });
    return;
  }
  await pool.execute('UPDATE pedido SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ id: Number(req.params.id), status });
}));

app.get('/api/financeiro', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, tipo, categoria, descricao, valor, data_lancamento AS dataLancamento, pedido_id AS pedidoId FROM lancamento_financeiro ORDER BY data_lancamento DESC');
  res.json(rows);
}));

app.post('/api/financeiro', asyncRoute(async (req, res) => {
  const { tipo, categoria = 'GERAL', descricao, valor, pedidoId = null } = req.body;
  if (!['RECEITA', 'DESPESA'].includes(tipo) || !descricao?.trim() || !Number.isFinite(Number(valor)) || Number(valor) <= 0) {
    res.status(400).json({ message: 'Informe tipo, descrição e valor válidos.' });
    return;
  }
  const [result] = await pool.execute<ResultSetHeader>('INSERT INTO lancamento_financeiro (tipo, categoria, descricao, valor, pedido_id) VALUES (?, ?, ?, ?, ?)', [tipo, categoria, descricao.trim(), valor, pedidoId]);
  res.status(201).json({ id: result.insertId, tipo, categoria, descricao: descricao.trim(), valor: Number(valor) });
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [[stock]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS totalIngredientes, COALESCE(SUM(quantidade_atual * preco_unitario), 0) AS valorEstoque FROM ingrediente WHERE ativo = 1');
  const [[alerts]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM ingrediente WHERE ativo = 1 AND quantidade_atual <= estoque_minimo');
  const [[financial]] = await pool.query<RowDataPacket[]>('SELECT COALESCE(SUM(CASE WHEN tipo = "RECEITA" THEN valor ELSE 0 END), 0) AS receitaTotal, COALESCE(SUM(CASE WHEN tipo = "DESPESA" THEN valor ELSE 0 END), 0) AS despesaTotal FROM lancamento_financeiro');
  const [[orders]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS totalPedidos, SUM(status = "PENDENTE") AS pedidosPendentes, COALESCE(SUM(valor_total), 0) AS valorPedidos, COALESCE(SUM(custo_total), 0) AS custoPedidos FROM pedido');
  const [[recipeCount]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS totalReceitas FROM receita WHERE ativo = 1');
  const cmvPercentual = Number(orders.valorPedidos) > 0 ? Number(orders.custoPedidos) * 100 / Number(orders.valorPedidos) : 0;
  res.json({
    totalIngredientes: Number(stock.totalIngredientes),
    valorEstoque: Number(stock.valorEstoque),
    alertasEstoque: Number(alerts.total),
    totalReceitas: Number(recipeCount.totalReceitas),
    totalPedidos: Number(orders.totalPedidos),
    pedidosPendentes: Number(orders.pedidosPendentes ?? 0),
    receitaTotal: Number(financial.receitaTotal),
    despesaTotal: Number(financial.despesaTotal),
    fluxoCaixa: Number(financial.receitaTotal) - Number(financial.despesaTotal),
    cmvPercentual,
    statusCmv: cmvPercentual > 30 ? 'RISCO_DE_PREJUIZO' : cmvPercentual < 25 ? 'OPORTUNIDADE_DE_AJUSTE' : 'ESTAVEL',
    valorPedidos: Number(orders.valorPedidos),
    custoPedidos: Number(orders.custoPedidos),
  });
}));

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'Erro interno ao processar a solicitação.' });
});

const port = Number(process.env.PORT ?? 8081);
app.listen(port, () => console.log(`API da confeitaria disponível na porta ${port}`));
