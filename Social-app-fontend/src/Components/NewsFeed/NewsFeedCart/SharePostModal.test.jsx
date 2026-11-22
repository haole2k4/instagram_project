import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import UserAppReducer from "../../../Redux/Reducer/UserAppDeucer";
import chatReducer from "../../../Redux/Reducer/chatSlice";
import instance from "../../../Utils/AxiosApi/Axios";
import SharePostModal from "./SharePostModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en" },
  }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SharePostModal", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("reads state.login.userInfo, renders conversations, and sends post share message", async () => {
    jest.spyOn(instance, "get").mockResolvedValue({
      data: [
        {
          id: 55,
          isGroupChat: false,
          participants: [
            { userId: 1, userFullname: "Alice", userNickname: "alice" },
            { userId: 2, userFullname: "Bob", userNickname: "bob" },
          ],
        },
      ],
    });
    const postSpy = jest.spyOn(instance, "post").mockResolvedValue({
      data: {
        id: 999,
        conversationId: 55,
        senderId: 1,
        content: "shared",
      },
    });

    const store = configureStore({
      reducer: {
        login: UserAppReducer,
        chat: chatReducer,
      },
      preloadedState: {
        login: {
          isLoggedIn: true,
          userInfo: { id: 1, userNickname: "alice" },
          accessToken: "tok",
          roles: ["USER"],
          status: "ACTIVE",
          suspendedUntil: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <SharePostModal
          isOpen={true}
          onClose={jest.fn()}
          post={{
            id: 77,
            title: "Hello world",
            user: { userNickname: "alice" },
            media: [{ url: "https://cdn.example.com/pic.jpg" }],
          }}
        />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "messenger.send" }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        "/messages",
        expect.objectContaining({
          conversationId: 55,
          senderId: 1,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Sent")).toBeInTheDocument();
    });
  });
});
