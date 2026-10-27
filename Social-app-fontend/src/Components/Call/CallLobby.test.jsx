import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import CallLobby from "./CallLobby";

describe("CallLobby", () => {
  const defaultProps = {
    targetInfo: { name: "Duy_Ваня", image: "/test.png" },
    isGroup: false,
    localStream: null,
    isVideoEnabled: false,
    isAudioEnabled: true,
    onToggleVideo: jest.fn(),
    onToggleAudio: jest.fn(),
    onTestSpeaker: jest.fn(),
    onOpenSettings: jest.fn(),
    onStartCall: jest.fn(),
    participantCount: 1,
    maxParticipants: 5,
  };

  test("renders preview card and target info card", () => {
    render(<CallLobby {...defaultProps} />);
    expect(screen.getByText("Camera off")).toBeInTheDocument();
    expect(screen.getByText("Duy_Ваня")).toBeInTheDocument();
    expect(screen.getByText("Ready to call?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start call" })).toBeInTheDocument();
  });

  test("triggers onStartCall when Start call button is clicked", () => {
    render(<CallLobby {...defaultProps} />);
    const startBtn = screen.getByRole("button", { name: "Start call" });
    fireEvent.click(startBtn);
    expect(defaultProps.onStartCall).toHaveBeenCalled();
  });

  test("triggers onToggleVideo and onToggleAudio", () => {
    render(<CallLobby {...defaultProps} />);
    const videoBtn = screen.getByRole("button", { name: /camera/i });
    fireEvent.click(videoBtn);
    expect(defaultProps.onToggleVideo).toHaveBeenCalled();

    const audioBtn = screen.getByRole("button", { name: /microphone/i });
    fireEvent.click(audioBtn);
    expect(defaultProps.onToggleAudio).toHaveBeenCalled();
  });

  test("disables Start call button if group is full", () => {
    render(
      <CallLobby
        {...defaultProps}
        isGroup={true}
        participantCount={6}
        maxParticipants={5}
      />
    );
    expect(
      screen.getByText(/Nhóm đã đạt giới hạn cuộc gọi/i)
    ).toBeInTheDocument();
    const startBtn = screen.getByRole("button", { name: "Start call" });
    expect(startBtn).toBeDisabled();
  });
});
