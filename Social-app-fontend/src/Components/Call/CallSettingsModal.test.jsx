import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import CallSettingsModal from "./CallSettingsModal";

describe("CallSettingsModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    audioDevices: [
      { deviceId: "mic-1", label: "Built-in Microphone" },
      { deviceId: "mic-2", label: "External Headset Mic" },
    ],
    audioOutputDevices: [
      { deviceId: "speaker-1", label: "Built-in Speaker" },
      { deviceId: "speaker-2", label: "Headphones" },
    ],
    selectedAudioDeviceId: "mic-1",
    selectedAudioOutputId: "speaker-1",
    onSelectAudioDevice: jest.fn(),
    onSelectAudioOutput: jest.fn(),
  };

  test("renders settings modal when isOpen is true", () => {
    render(<CallSettingsModal {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Microphone")).toBeInTheDocument();
    expect(screen.getByText("Audio output")).toBeInTheDocument();
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Built-in Microphone")).toBeInTheDocument();
    expect(screen.getByText("Built-in Speaker")).toBeInTheDocument();
  });

  test("does not render when isOpen is false", () => {
    const { container } = render(
      <CallSettingsModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("calls onClose when close button or Done is clicked", () => {
    render(<CallSettingsModal {...defaultProps} />);
    const doneBtn = screen.getByText("Done");
    fireEvent.click(doneBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test("triggers onSelectAudioDevice when microphone changes", () => {
    render(<CallSettingsModal {...defaultProps} />);
    const select = screen.getByLabelText("Microphone");
    fireEvent.change(select, { target: { value: "mic-2" } });
    expect(defaultProps.onSelectAudioDevice).toHaveBeenCalledWith("mic-2");
  });
});
