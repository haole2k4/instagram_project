package com.example.backend_instagram.config;

import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.RoleService;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

@Component("userDetailService")
public class UserDetailCustom implements UserDetailsService {

  private final UserRepository userRepository;

  public UserDetailCustom(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    User user = this.userRepository.findByUserEmail(username);

    if (user == null) {
      throw new UsernameNotFoundException("User not found with email: " + username);
    }

    List<RoleCode> rawCodes = user.getRoles() == null
      ? List.of()
      : user.getRoles().stream().map(Role::getCode).toList();

    List<SimpleGrantedAuthority> authorities = RoleService
      .expandRoles(rawCodes)
      .stream()
      .map(code -> new SimpleGrantedAuthority("ROLE_" + code.name()))
      .toList();

    return new org.springframework.security.core.userdetails.User(
      user.getUserEmail(),
      user.getUserPassword(),
      authorities
    );
  }
}
