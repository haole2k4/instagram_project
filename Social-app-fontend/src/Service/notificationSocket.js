import webSocketService from "./webSocketService";

/**
 * Facade tương thích cho các component cũ đang dùng notificationSocket.
 *
 * Không còn mở kết nối riêng. Mọi thứ đi qua webSocketService để cả app
 * chỉ có 1 connection. Mỗi subscription trả về cleanup riêng để tránh gỡ nhầm
 * listener của component khác đang mount.
 */
class NotificationWebSocket {
  constructor() {
    this.unsubscribers = new Set();
    this.connected = false;
  }

  init(dispatch, userId, accessToken) {
    webSocketService.init(dispatch, userId, accessToken);
    webSocketService
      .connect()
      .then(() => {
        this.connected = true;
      })
      .catch((error) => {
        this.connected = false;
        console.error("Cannot connect notification WebSocket:", error);
      });
  }

  _addNotificationListener(handler) {
    const rawUnsubscribe = webSocketService.on("notification", handler);
    const unsubscribe = () => {
      rawUnsubscribe();
      this.unsubscribers.delete(unsubscribe);
    };
    this.unsubscribers.add(unsubscribe);
    return unsubscribe;
  }

  subscribeToNotifications(callback) {
    return this._addNotificationListener((notification) => {
      if (typeof callback === "function") {
        callback(notification);
      }
    });
  }

  subscribeToLikeUpdates(callback) {
    return this._addNotificationListener((data) => {
      if (
        data &&
        (data.type === "LIKE" ||
          (typeof data.message === "string" && data.message.includes("liked")))
      ) {
        callback(data);
      }
    });
  }

  subscribeToCommentUpdates(callback) {
    return this._addNotificationListener((data) => {
      if (
        data &&
        (data.type === "COMMENT" ||
          (typeof data.message === "string" &&
            data.message.includes("commented")))
      ) {
        callback(data);
      }
    });
  }

  subscribeToFollow(callback) {
    return this._addNotificationListener((data) => {
      if (
        data &&
        (data.type === "FOLLOW" ||
          (typeof data.message === "string" &&
            (data.message.includes("follow") ||
              data.message.includes("theo dõi"))))
      ) {
        callback(data);
      }
    });
  }

  disconnect() {
    [...this.unsubscribers].forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("Error removing notification listener:", error);
      }
    });
    this.unsubscribers.clear();
    this.connected = false;
  }

  isConnected() {
    return webSocketService.isConnected();
  }
}

const notificationWebSocket = new NotificationWebSocket();
export default notificationWebSocket;
