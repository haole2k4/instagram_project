import React from "react";
import { useParams } from "react-router-dom";
import MessengerPage from "../../Components/Messenger/MessengerPage";

const ChatPage = () => {
  const { conversationId } = useParams();

  return <MessengerPage conversationId={conversationId} />;
};

export default ChatPage;
