package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByCode(RoleCode code);
}
