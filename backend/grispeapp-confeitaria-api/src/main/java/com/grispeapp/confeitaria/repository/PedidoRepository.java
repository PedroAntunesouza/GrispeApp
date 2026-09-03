package com.grispeapp.confeitaria.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.grispeapp.confeitaria.entity.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    List<Pedido> findAllByOrderByDataPedidoDesc();

    long countByStatus(String status);
}

