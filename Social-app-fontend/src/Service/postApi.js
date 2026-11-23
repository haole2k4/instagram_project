import instance from "../Utils/AxiosApi/Axios";

const getAllPost = () => {
  return instance.get("/posts");
};

const handleGetAllPostByUserId = (id) => {
  return instance.get(`/posts/user/${id}`);
};

const handleCreatePost = (data) => {
  return instance.post("/posts", data);
};

export const getLikedPostIdsByUser = (userId) => {
  return instance.get(`/posts/liked/user/${userId}`);
};

export const likePost = (postId, userId) => {
  return instance.post(`/posts/${postId}/like?userId=${userId}`);
};

export const unlikePost = (postId, userId) => {
  return instance.delete(`/posts/${postId}/like?userId=${userId}`);
};

const handleDeletePost = (id) => {
  return instance.delete(`/posts/${id}`);
};

const handleUpdateStatus = (data) => {
  return instance.put(`/posts/updateStatus`, data);
};

export const getPostByFollowing = (id) => {
  return instance.get(`/posts/following/${id}`);
};

export {
  handleGetAllPostByUserId,
  handleCreatePost,
  handleDeletePost,
  getAllPost,
  handleUpdateStatus,
};
