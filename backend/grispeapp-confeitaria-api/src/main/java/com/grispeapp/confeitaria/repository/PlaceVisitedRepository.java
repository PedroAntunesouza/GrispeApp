package com.grispeapp.confeitaria.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.grispeapp.confeitaria.entity.PlaceVisited;

public interface PlaceVisitedRepository extends JpaRepository<PlaceVisited, Long> {
    @Query("SELECT p FROM PlaceVisited p WHERE p.user.email = :email")
    List<PlaceVisited> findByUserEmail(@Param("email") String email);

    List<PlaceVisited> findByAuthor(String author);
}

