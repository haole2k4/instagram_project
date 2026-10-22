package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Notification;
import com.example.backend_instagram.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderBySentAtDesc(User user);

    List<Notification> findByUserAndIsReadFalseOrderBySentAtDesc(User user);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user = :user AND n.isRead = false")
    void markAllAsReadByUser(User user);

    /**
     * Trả về 1 nếu notification chưa được đẩy, 0 nếu đã đẩy hoặc không tồn tại.
     * Dùng để chống push trùng khi RabbitMQ redeliver.
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE Notification n
            SET n.pushedAt = CURRENT_TIMESTAMP
            WHERE n.notificationId = :notificationId AND n.pushedAt IS NULL
            """)
    int markPushed(@Param("notificationId") Long notificationId);
}
