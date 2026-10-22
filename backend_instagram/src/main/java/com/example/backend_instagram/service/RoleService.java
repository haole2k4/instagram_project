package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.RoleRepository;
import com.example.backend_instagram.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;

@Service
public class RoleService implements ApplicationRunner {
  private final RoleRepository roleRepository;
  private final UserRepository userRepository;

  public RoleService(RoleRepository roleRepository, UserRepository userRepository) {
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
  }

  public List<RoleCode> rolesOf(User user) {
    if (user == null || user.getRoles() == null) {
      return List.of();
    }
    return user.getRoles().stream().map(Role::getCode).toList();
  }

  public void ensureDefaultRole(User user) {
    if (user.hasRole(RoleCode.USER)) {
      return;
    }
    Role role = roleRepository
      .findByCode(RoleCode.USER)
      .orElseGet(() -> {
        Role created = new Role();
        created.setCode(RoleCode.USER);
        return roleRepository.save(created);
      });
    user.addRole(role);
  }

  @Override
  public void run(ApplicationArguments args) {
    Arrays
      .stream(RoleCode.values())
      .forEach(code -> roleRepository.findByCode(code).orElseGet(() -> {
        Role role = new Role();
        role.setCode(code);
        return roleRepository.save(role);
      }));

    // Bootstrap cho database cũ: mọi tài khoản đều có role USER.
    userRepository
      .findAll()
      .stream()
      .filter(user -> !user.hasRole(RoleCode.USER))
      .forEach(user -> {
        ensureDefaultRole(user);
        userRepository.save(user);
      });
  }
}
