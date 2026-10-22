package com.example.backend_instagram.config;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.UserRepository;
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

    List<SimpleGrantedAuthority> authorities = user.getRoles() == null
      ? List.of()
      : user
        .getRoles()
        .stream()
        .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode().name()))
        .toList();

    if (authorities.isEmpty()) {
      authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    return new org.springframework.security.core.userdetails.User(
      user.getUserEmail(),
      user.getUserPassword(),
      authorities
    );
  }
}
