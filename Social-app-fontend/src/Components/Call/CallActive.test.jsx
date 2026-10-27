import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import CallActive from "./CallActive";

describe("CallActive", () => {
  const defaultProps = {
    currentUser: { id: "1", userFullname: "Lê Chí Hào", userImage: "/user.png" },
    targetInfo: { name: "Duy_Ваня", image: "/target.png" },
    isGroup: false,
    isCalling: true,
    participants: [],
    localStream: null,
    isVideoEnabled: false,
    isAudioEnabled: true,
    isScreenSharing: false,
    audioDeviceLabel: "Ryzen HD Audio Controller Analog Stereo",
    onToggleVideo: jest.fn(),
    onToggleAudio: jest.fn(),
    onToggleScreenShare: jest.fn(),
    onEndCall: jest.fn(),
    onOpenSettings: jest.fn(),
  };

  test("renders calling state with device banner and target name", () => {
    render(<CallActive {...defaultProps} />);
    expect(screen.getByText("Lê Chí Hào")).toBeInTheDocument();
    expect(screen.getByText("Calling...")).toBeInTheDocument();
    expect(screen.getByText("Duy_Ваня")).toBeInTheDocument();
    expect(
      screen.getByText(/Connected microphone and speaker:/i)
    ).toBeInTheDocument();
  });

  test("calls onEndCall when end call button is clicked", () => {
    render(<CallActive {...defaultProps} />);
    const endBtn = screen.getByRole("button", { name: /End call/i });
    fireEvent.click(endBtn);
    expect(defaultProps.onEndCall).toHaveBeenCalled();
  });

  test("calls onOpenSettings when settings button is clicked", () => {
    render(<CallActive {...defaultProps} />);
    const settingsBtn = screen.getByRole("button", { name: /Settings/i });
    fireEvent.click(settingsBtn);
    expect(defaultProps.onOpenSettings).toHaveBeenCalled();
  });

  test("triggers shortcuts on Alt + E and Alt + M", () => {
    render(<CallActive {...defaultProps} />);
    fireEvent.keyDown(window, { key: "e", altKey: true });
    expect(defaultProps.onEndCall).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "m", altKey: true });
    expect(defaultProps.onToggleAudio).toHaveBeenCalled();
  });

  test("renders group participants grid in group mode", () => {
    render(
      <CallActive
        {...defaultProps}
        isGroup={true}
        isCalling={false}
        participants={[
          { id: "2", name: "Duy", image: "/duy.png", stream: null, isMuted: false, isCameraOff: true },
          { id: "3", name: "Minh", image: "/minh.png", stream: null, isMuted: true, isCameraOff: true },
        ]}
      />
    );
    expect(screen.getByText("3 people")).toBeInTheDocument();
    expect(screen.getAllByText("Duy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Minh").length).toBeGreaterThan(0);
  });
});
