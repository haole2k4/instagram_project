package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.RoleRepository;
import com.example.backend_instagram.repository.UserRepository;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleService implements ApplicationRunner {
  private final RoleRepository roleRepository;
  private final UserRepository userRepository;

  public RoleService(RoleRepository roleRepository, UserRepository userRepository) {
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
  }

  public List<RoleCode> rolesOf(User user) {
    if (user == null) {
      return List.of();
    }
    if (user.getRoles() == null || user.getRoles().isEmpty()) {
      return List.of(RoleCode.USER);
    }
    return expandRoles(user.getRoles().stream().map(Role::getCode).toList());
  }

  public static List<RoleCode> expandRoles(Collection<RoleCode> rawRoles) {
    Set<RoleCode> expanded = EnumSet.noneOf(RoleCode.class);
    if (rawRoles != null) {
      for (RoleCode code : rawRoles) {
        if (code == null) {
          continue;
        }
        expanded.add(RoleCode.USER);
        if (code == RoleCode.MODERATOR) {
          expanded.add(RoleCode.MODERATOR);
        } else if (code == RoleCode.ADMIN) {
          expanded.add(RoleCode.MODERATOR);
          expanded.add(RoleCode.ADMIN);
        }
      }
    }
    if (expanded.isEmpty()) {
      expanded.add(RoleCode.USER);
    }
    return List.copyOf(expanded);
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
  @Transactional
  public void run(ApplicationArguments args) {
    Role userRole = null;
    for (RoleCode code : RoleCode.values()) {
      Role role = roleRepository.findByCode(code).orElseGet(() -> {
        Role created = new Role();
        created.setCode(code);
        return roleRepository.save(created);
      });
      if (code == RoleCode.USER) {
        userRole = role;
      }
    }

    // Bootstrap cho database cũ: chỉ lấy user chưa có role USER.
    final Role defaultRole = userRole;
    List<User> usersWithoutDefaultRole = userRepository.findAll(
      (root, query, cb) -> cb.isNotMember(defaultRole, root.get("roles"))
    );
    if (!usersWithoutDefaultRole.isEmpty()) {
      for (User user : usersWithoutDefaultRole) {
        user.addRole(defaultRole);
      }
      userRepository.saveAll(usersWithoutDefaultRole);
    }
  }
}
