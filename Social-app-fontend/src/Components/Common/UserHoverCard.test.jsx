import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import UserAppReducer from "../../Redux/Reducer/UserAppDeucer";
import chatReducer from "../../Redux/Reducer/chatSlice";
import UserHoverCard from "./UserHoverCard";
import {
  handleGetUserById,
  handleGetFollowersByUser,
} from "../../Service/userApi";
import { handleGetAllPostByUserId } from "../../Service/postApi";

const mockNavigate = jest.fn();

jest.mock(
  "react-router-dom",
  () => ({
    MemoryRouter: ({ children }) => <>{children}</>,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "vi" },
  }),
}));

jest.mock("../../Service/userApi", () => ({
  handleGetUserById: jest.fn(),
  handleGetFollowersByUser: jest.fn(),
  handlePostFollower: jest.fn(),
  handlePostUnfollower: jest.fn(),
}));

jest.mock("../../Service/postApi", () => ({
  handleGetAllPostByUserId: jest.fn(),
}));

const makeStore = (userId = 10) =>
  configureStore({
    reducer: {
      login: UserAppReducer,
      chat: chatReducer,
    },
    preloadedState: {
      login: {
        isLoggedIn: true,
        userInfo: { id: userId, userNickname: `user_${userId}` },
        accessToken: "tok",
        roles: ["USER"],
        status: "ACTIVE",
        suspendedUntil: null,
      },
    },
  });

describe("UserHoverCard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    handleGetUserById.mockResolvedValue({
      statusCode: 200,
      data: {
        userNickname: "target_user",
        userFullname: "Target User",
        postsCount: 4,
        followersCount: 12,
        followingCount: 5,
      },
    });
    handleGetAllPostByUserId.mockResolvedValue({
      statusCode: 200,
      data: [],
    });
    handleGetFollowersByUser.mockResolvedValue({
      statusCode: 200,
      data: [],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("reads state.login.userInfo and renders without fabricated Verified or Threads badges", async () => {
    const store = makeStore(10);
    render(
      <Provider store={store}>
        <MemoryRouter>
          <UserHoverCard user={{ id: 20, userNickname: "target_user" }}>
            <span>Hover me</span>
          </UserHoverCard>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.mouseEnter(screen.getByText("Hover me"));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("Target User")).toBeInTheDocument();
    });

    expect(screen.queryByTitle("Verified")).not.toBeInTheDocument();
    expect(screen.queryByText("@")).not.toBeInTheDocument();
    expect(screen.getByText("userProfile.message")).toBeInTheDocument();
  });

  test("clears hover timer on unmount without throwing", () => {
    const store = makeStore(10);
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    const { unmount } = render(
      <Provider store={store}>
        <MemoryRouter>
          <UserHoverCard user={{ id: 20, userNickname: "target_user" }}>
            <span>Hover trigger</span>
          </UserHoverCard>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.mouseEnter(screen.getByText("Hover trigger"));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test("clears cardCache when currentUser.id changes", async () => {
    const storeA = makeStore(101);
    const { rerender } = render(
      <Provider store={storeA}>
        <MemoryRouter>
          <UserHoverCard user={{ id: 20, userNickname: "target_user" }}>
            <span>Trigger</span>
          </UserHoverCard>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(handleGetUserById).toHaveBeenCalledTimes(1);
    });

    const storeB = makeStore(202);
    rerender(
      <Provider store={storeB}>
        <MemoryRouter>
          <UserHoverCard user={{ id: 20, userNickname: "target_user" }}>
            <span>Trigger</span>
          </UserHoverCard>
        </MemoryRouter>
      </Provider>
    );

    fireEvent.mouseEnter(screen.getByText("Trigger"));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(handleGetUserById).toHaveBeenCalledTimes(2);
    });
  });
});
