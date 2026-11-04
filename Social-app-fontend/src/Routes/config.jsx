import { Navigate } from "react-router-dom";
import FormCreateNewsFeed from "../Components/NewsFeed/FormCreate/FormCreate";
import FormCreateStories from "../Components/Stories/FormCreate/FormCreate";
import Profile from "../Components/Profile/UserProfile/UserProfile";
import Route from "../Components/Routes/index";
import Search from "../Components/SearchBar/SearchBar";
import Noti from "../Components/Notifications/Notifications";
import Home from "../Components/Home/Home";
import ChatPage from "../Components/Messenger/ChatPage";
import StoryViewer from "../Components/Stories/StoryViewer";
import FriendProfile from "../Components/Profile/UserProfile/FriendProfile";
import Settings from "../Components/Settings/Settings";

const routes = [
  { path: Route.profile, element: <Profile /> },
  { path: Route.default_session, element: <Home /> },
  { path: Route.create_newsfeed, element: <FormCreateNewsFeed /> },
  { path: Route.create_story, element: <FormCreateStories /> },
  {
    path: Route.edit_profile + "/:id",
    element: <Navigate to={`${Route.settings}?tab=edit_profile`} replace />,
  },
  { path: Route.friend_profile + "/:id", element: <FriendProfile /> },
  { path: Route.notification, element: <Noti /> },
  { path: Route.chat_ai, element: <ChatPage /> },
  { path: Route.chat, element: <ChatPage /> },
  { path: Route.chat + "/:conversationId", element: <ChatPage /> },
  { path: Route.story + "/:id", element: <StoryViewer /> },
  { path: Route.search, element: <Search isOpen={true} standalone={true} /> },
  { path: Route.settings, element: <Settings /> },
];

export default routes;
