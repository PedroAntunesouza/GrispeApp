package com.grispeapp.confeitaria.controller;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.grispeapp.confeitaria.entity.EstoqueMovimentacao;
import com.grispeapp.confeitaria.entity.Ingrediente;
import com.grispeapp.confeitaria.entity.LancamentoFinanceiro;
import com.grispeapp.confeitaria.entity.Pedido;
import com.grispeapp.confeitaria.entity.PedidoItem;
import com.grispeapp.confeitaria.entity.Receita;
import com.grispeapp.confeitaria.entity.ReceitaIngrediente;
import com.grispeapp.confeitaria.repository.EstoqueMovimentacaoRepository;
import com.grispeapp.confeitaria.repository.IngredienteRepository;
import com.grispeapp.confeitaria.repository.LancamentoFinanceiroRepository;
import com.grispeapp.confeitaria.repository.PedidoRepository;
import com.grispeapp.confeitaria.repository.ReceitaRepository;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class ConfeitariaController {

    private final IngredienteRepository ingredienteRepository;
    private final ReceitaRepository receitaRepository;
    private final PedidoRepository pedidoRepository;
    private final EstoqueMovimentacaoRepository movimentacaoRepository;
    private final LancamentoFinanceiroRepository lancamentoRepository;

    public ConfeitariaController(
            IngredienteRepository ingredienteRepository,
            ReceitaRepository receitaRepository,
            PedidoRepository pedidoRepository,
            EstoqueMovimentacaoRepository movimentacaoRepository,
            LancamentoFinanceiroRepository lancamentoRepository) {
        this.ingredienteRepository = ingredienteRepository;
        this.receitaRepository = receitaRepository;
        this.pedidoRepository = pedidoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.lancamentoRepository = lancamentoRepository;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        List<Ingrediente> ingredientes = ingredienteRepository.findAllByOrderByNomeAsc();

        BigDecimal valorEstoque = ingredientes.stream()
                .map(item -> item.getQuantidadeAtual().multiply(item.getPrecoUnitario()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> alertas = ingredientes.stream()
                .filter(item -> item.getQuantidadeAtual().compareTo(item.getEstoqueMinimo()) <= 0)
                .map(item -> {
                    Map<String, Object> alerta = new HashMap<>();
                    alerta.put("ingredienteId", item.getId());
                    alerta.put("nome", item.getNome());
                    alerta.put("quantidadeAtual", item.getQuantidadeAtual());
                    alerta.put("estoqueMinimo", item.getEstoqueMinimo());
                    return alerta;
                })
                .toList();

        BigDecimal receitaTotal = lancamentoRepository.sumByTipo("RECEITA");
        BigDecimal despesaTotal = lancamentoRepository.sumByTipo("DESPESA");
        BigDecimal fluxoCaixa = receitaTotal.subtract(despesaTotal);

        BigDecimal totalPedido = pedidoRepository.findAll().stream()
                .map(Pedido::getValorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCustoPedidos = pedidoRepository.findAll().stream()
                .map(Pedido::getCustoTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cmvPercentual = BigDecimal.ZERO;
        if (totalPedido.compareTo(BigDecimal.ZERO) > 0) {
            cmvPercentual = totalCustoPedidos.multiply(BigDecimal.valueOf(100))
                    .divide(totalPedido, 2, RoundingMode.HALF_UP);
        }

        String statusCmv = "ESTAVEL";
        if (cmvPercentual.compareTo(BigDecimal.valueOf(30)) > 0) {
            statusCmv = "RISCO_DE_PREJUIZO";
        } else if (cmvPercentual.compareTo(BigDecimal.valueOf(25)) < 0) {
            statusCmv = "OPORTUNIDADE_DE_AJUSTE";
        }

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalIngredientes", ingredientes.size());
        dashboard.put("alertasEstoque", alertas);
        dashboard.put("valorEstoque", valorEstoque.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("totalReceitas", receitaRepository.count());
        dashboard.put("totalPedidos", pedidoRepository.count());
        dashboard.put("pedidosPendentes", pedidoRepository.countByStatus("PENDENTE"));
        dashboard.put("receitaTotal", receitaTotal.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("despesaTotal", despesaTotal.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("fluxoCaixa", fluxoCaixa.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("cmvPercentual", cmvPercentual.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("statusCmv", statusCmv);
        dashboard.put("valorPedidos", totalPedido.setScale(2, RoundingMode.HALF_UP));
        dashboard.put("custoPedidos", totalCustoPedidos.setScale(2, RoundingMode.HALF_UP));
        return dashboard;
    }

    @GetMapping("/ingredientes")
    public List<Ingrediente> listarIngredientes() {
        return ingredienteRepository.findAllByOrderByNomeAsc();
    }

    @PostMapping("/ingredientes")
    public ResponseEntity<Ingrediente> criarIngrediente(@RequestBody Ingrediente ingrediente) {
        if (ingrediente.getNome() == null || ingrediente.getNome().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (ingrediente.getQuantidadeAtual() == null) {
            ingrediente.setQuantidadeAtual(BigDecimal.ZERO);
        }
        if (ingrediente.getEstoqueMinimo() == null) {
            ingrediente.setEstoqueMinimo(BigDecimal.ZERO);
        }
        if (ingrediente.getPrecoUnitario() == null) {
            ingrediente.setPrecoUnitario(BigDecimal.ZERO);
        }
        LocalDateTime now = LocalDateTime.now();
        ingrediente.setAtivo(true);
        ingrediente.setCriadoEm(now);
        ingrediente.setAtualizadoEm(now);
        Ingrediente salvo = ingredienteRepository.save(ingrediente);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PostMapping("/ingredientes/{id}/movimentacao")
    public ResponseEntity<Ingrediente> registrarMovimentacao(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {

        Ingrediente ingrediente = ingredienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ingrediente nÃ£o encontrado"));

        String tipo = String.valueOf(payload.getOrDefault("tipo", "ENTRADA")).toUpperCase();
        BigDecimal quantidade = new BigDecimal(String.valueOf(payload.getOrDefault("quantidade", "0")));
        String motivo = String.valueOf(payload.getOrDefault("motivo", "MovimentaÃ§Ã£o"));

        if (quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().build();
        }

        BigDecimal saldoAtual = ingrediente.getQuantidadeAtual();
        if ("SAIDA".equals(tipo)) {
            if (saldoAtual.compareTo(quantidade) < 0) {
                throw new RuntimeException("Quantidade insuficiente em estoque");
            }
            ingrediente.setQuantidadeAtual(saldoAtual.subtract(quantidade));
        } else {
            ingrediente.setQuantidadeAtual(saldoAtual.add(quantidade));
        }

        EstoqueMovimentacao movimentacao = new EstoqueMovimentacao();
        movimentacao.setTipo(tipo);
        movimentacao.setQuantidade(quantidade);
        movimentacao.setMotivo(motivo);
        movimentacao.setDataHora(LocalDateTime.now());
        movimentacao.setIngrediente(ingrediente);
        movimentacaoRepository.save(movimentacao);

        ingrediente.setAtualizadoEm(LocalDateTime.now());
        return ResponseEntity.ok(ingredienteRepository.save(ingrediente));
    }

    @GetMapping("/receitas")
    public List<Receita> listarReceitas() {
        return receitaRepository.findAllByOrderByNomeAsc();
    }

    @PostMapping("/receitas")
    public ResponseEntity<Receita> criarReceita(@RequestBody Map<String, Object> payload) {
        String nome = String.valueOf(payload.getOrDefault("nome", "")).trim();
        String descricao = String.valueOf(payload.getOrDefault("descricao", ""));
        List<Map<String, Object>> ingredientesPayload = (List<Map<String, Object>>) payload.get("ingredientes");

        if (nome.isBlank() || ingredientesPayload == null || ingredientesPayload.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Receita receita = new Receita();
        receita.setNome(nome);
        receita.setDescricao(descricao);
        receita.setAtivo(true);
        receita.setCriadoEm(LocalDateTime.now());

        List<ReceitaIngrediente> itens = new ArrayList<>();
        for (Map<String, Object> item : ingredientesPayload) {
            Long ingredienteId = Long.valueOf(String.valueOf(item.get("ingredienteId")));
            BigDecimal quantidade = new BigDecimal(String.valueOf(item.get("quantidade")));
            Ingrediente ingrediente = ingredienteRepository.findById(ingredienteId)
                    .orElseThrow(() -> new RuntimeException("Ingrediente nÃ£o encontrado: " + ingredienteId));

            ReceitaIngrediente receitaIngrediente = new ReceitaIngrediente();
            receitaIngrediente.setReceita(receita);
            receitaIngrediente.setIngrediente(ingrediente);
            receitaIngrediente.setQuantidade(quantidade);
            itens.add(receitaIngrediente);
        }

        receita.setIngredientes(itens);
        return ResponseEntity.status(HttpStatus.CREATED).body(receitaRepository.save(receita));
    }

    @GetMapping("/pedidos")
    public List<Pedido> listarPedidos() {
        return pedidoRepository.findAllByOrderByDataPedidoDesc();
    }

    @PostMapping("/pedidos")
    public ResponseEntity<Pedido> criarPedido(@RequestBody Map<String, Object> payload) {
        String cliente = String.valueOf(payload.getOrDefault("cliente", "")).trim();
        String observacao = String.valueOf(payload.getOrDefault("observacao", ""));
        List<Map<String, Object>> itensPayload = (List<Map<String, Object>>) payload.get("itens");

        if (cliente.isBlank() || itensPayload == null || itensPayload.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Pedido pedido = new Pedido();
        pedido.setCliente(cliente);
        pedido.setObservacao(observacao);
        pedido.setStatus("PENDENTE");
        pedido.setDataPedido(LocalDateTime.now());

        BigDecimal valorTotal = BigDecimal.ZERO;
        BigDecimal custoTotal = BigDecimal.ZERO;
        List<PedidoItem> itens = new ArrayList<>();

        for (Map<String, Object> item : itensPayload) {
            Long receitaId = Long.valueOf(String.valueOf(item.get("receitaId")));
            Integer quantidade = Integer.valueOf(String.valueOf(item.get("quantidade")));
            BigDecimal precoVenda = new BigDecimal(String.valueOf(item.get("precoVenda")));

            Receita receita = receitaRepository.findById(receitaId)
                    .orElseThrow(() -> new RuntimeException("Receita nÃ£o encontrada: " + receitaId));

            PedidoItem pedidoItem = new PedidoItem();
            pedidoItem.setReceita(receita);
            pedidoItem.setQuantidade(quantidade);
            pedidoItem.setPrecoVenda(precoVenda);
            pedidoItem.setCustoTotal(calcularCustoReceita(receita, quantidade));
            pedidoItem.setPedido(pedido);
            itens.add(pedidoItem);

            valorTotal = valorTotal.add(precoVenda.multiply(BigDecimal.valueOf(quantidade)));
            custoTotal = custoTotal.add(pedidoItem.getCustoTotal());
        }

        pedido.setItens(itens);
        pedido.setValorTotal(valorTotal);
        pedido.setCustoTotal(custoTotal);
        return ResponseEntity.status(HttpStatus.CREATED).body(pedidoRepository.save(pedido));
    }

    @PatchMapping("/pedidos/{id}/status")
    public ResponseEntity<Pedido> atualizarStatusPedido(
            @PathVariable Long id,
            @RequestParam String status) {

        Optional<Pedido> pedidoOptional = pedidoRepository.findById(id);
        if (pedidoOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Pedido pedido = pedidoOptional.get();
        String statusNormalizado = status.trim().toUpperCase();
        pedido.setStatus(statusNormalizado);

        if ("EM_PRODUCAO".equals(statusNormalizado) || "CONCLUIDO".equals(statusNormalizado)) {
            baixarEstoquePedido(pedido);
        }

        return ResponseEntity.ok(pedidoRepository.save(pedido));
    }

    @GetMapping("/financeiro")
    public List<LancamentoFinanceiro> listarLancamentosFinanceiros() {
        return lancamentoRepository.findAllByOrderByDataLancamentoDesc();
    }

    @PostMapping("/financeiro")
    public ResponseEntity<LancamentoFinanceiro> criarLancamento(@RequestBody Map<String, Object> payload) {
        String tipo = String.valueOf(payload.getOrDefault("tipo", "RECEITA")).toUpperCase();
        String categoria = String.valueOf(payload.getOrDefault("categoria", "GERAL"));
        String descricao = String.valueOf(payload.getOrDefault("descricao", ""));
        BigDecimal valor = new BigDecimal(String.valueOf(payload.getOrDefault("valor", "0")));

        if (valor.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().build();
        }

        LancamentoFinanceiro lancamento = new LancamentoFinanceiro();
        lancamento.setTipo(tipo);
        lancamento.setCategoria(categoria);
        lancamento.setDescricao(descricao);
        lancamento.setValor(valor);
        lancamento.setDataLancamento(LocalDateTime.now());

        if (payload.containsKey("pedidoId")) {
            Long pedidoId = Long.valueOf(String.valueOf(payload.get("pedidoId")));
            pedidoRepository.findById(pedidoId).ifPresent(lancamento::setPedido);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(lancamentoRepository.save(lancamento));
    }

    private BigDecimal calcularCustoReceita(Receita receita, Integer quantidade) {
        BigDecimal custoTotal = BigDecimal.ZERO;
        if (receita.getIngredientes() == null) {
            return custoTotal;
        }

        for (ReceitaIngrediente item : receita.getIngredientes()) {
            BigDecimal custoIngrediente = item.getIngrediente().getPrecoUnitario()
                    .multiply(item.getQuantidade())
                    .multiply(BigDecimal.valueOf(quantidade));
            custoTotal = custoTotal.add(custoIngrediente);
        }
        return custoTotal;
    }

    private void baixarEstoquePedido(Pedido pedido) {
        if (pedido.getItens() == null) {
            return;
        }

        for (PedidoItem item : pedido.getItens()) {
            Receita receita = item.getReceita();
            if (receita == null || receita.getIngredientes() == null) {
                continue;
            }

            for (ReceitaIngrediente receitaIngrediente : receita.getIngredientes()) {
                Ingrediente ingrediente = receitaIngrediente.getIngrediente();
                BigDecimal quantidadeNecessaria = receitaIngrediente.getQuantidade()
                        .multiply(BigDecimal.valueOf(item.getQuantidade()));

                if (ingrediente.getQuantidadeAtual().compareTo(quantidadeNecessaria) < 0) {
                    throw new RuntimeException("Estoque insuficiente para o ingrediente: " + ingrediente.getNome());
                }

                ingrediente.setQuantidadeAtual(ingrediente.getQuantidadeAtual().subtract(quantidadeNecessaria));
                ingrediente.setAtualizadoEm(LocalDateTime.now());
                ingredienteRepository.save(ingrediente);

                EstoqueMovimentacao movimentacao = new EstoqueMovimentacao();
                movimentacao.setTipo("SAIDA");
                movimentacao.setQuantidade(quantidadeNecessaria);
                movimentacao.setMotivo("Pedido " + pedido.getId());
                movimentacao.setDataHora(LocalDateTime.now());
                movimentacao.setIngrediente(ingrediente);
                movimentacaoRepository.save(movimentacao);
            }
        }
    }
}

