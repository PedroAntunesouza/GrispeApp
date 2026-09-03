package com.grispeapp.confeitaria.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.grispeapp.confeitaria.entity.EstoqueMovimentacao;
import com.grispeapp.confeitaria.entity.Ingrediente;

public interface EstoqueMovimentacaoRepository extends JpaRepository<EstoqueMovimentacao, Long> {

    List<EstoqueMovimentacao> findByIngredienteOrderByDataHoraDesc(Ingrediente ingrediente);
}

