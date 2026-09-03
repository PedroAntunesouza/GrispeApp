package com.grispeapp.confeitaria.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.grispeapp.confeitaria.entity.Ingrediente;

public interface IngredienteRepository extends JpaRepository<Ingrediente, Long> {

    List<Ingrediente> findAllByOrderByNomeAsc();
}

