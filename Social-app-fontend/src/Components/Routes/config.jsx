const USER_PATH = "/user";

const routes = {
  default_session: `${USER_PATH}/home`,
  profile: `${USER_PATH}/profile`,
  create_newsfeed: `${USER_PATH}/create-post`,
  create_story: `${USER_PATH}/create-story`,
  edit_profile: `/edit-profile`,
  chat: `${USER_PATH}/chat`,
  chat_ai: `${USER_PATH}/chat/ai`,
  notification: `${USER_PATH}/notifications`,
  story: `${USER_PATH}/story`,
  friend_profile: `${USER_PATH}/friend-profile`,
  search: `${USER_PATH}/search`,
  settings: `${USER_PATH}/settings`,
};

export default routes;
