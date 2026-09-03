package com.grispeapp.confeitaria.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.grispeapp.confeitaria.entity.Receita;

public interface ReceitaRepository extends JpaRepository<Receita, Long> {

    List<Receita> findAllByOrderByNomeAsc();
}

