import React, { useState, useEffect } from "react";
import { X, Play, Square, HelpCircle } from "lucide-react";
import { playTestSound } from "../../Utils/callSounds";

const CallSettingsModal = ({
  isOpen,
  onClose,
  audioDevices = [],
  audioOutputDevices = [],
  selectedAudioDeviceId,
  selectedAudioOutputId,
  onSelectAudioDevice,
  onSelectAudioOutput,
}) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testPlayerRef, setTestPlayerRef] = useState(null);

  useEffect(() => {
    return () => {
      if (testPlayerRef) {
        testPlayerRef.stop();
      }
    };
  }, [testPlayerRef]);

  if (!isOpen) return null;

  const handleToggleTestSound = () => {
    if (isPlayingTest) {
      if (testPlayerRef) testPlayerRef.stop();
      setIsPlayingTest(false);
      setTestProgress(0);
    } else {
      setIsPlayingTest(true);
      const player = playTestSound({
        deviceId: selectedAudioOutputId,
        onProgress: (elapsed) => {
          setTestProgress(elapsed);
        },
        onEnded: () => {
          setIsPlayingTest(false);
          setTestProgress(0);
        },
      });
      setTestPlayerRef(player);
    }
  };

  const shortcuts = [
    { label: "End call", keys: ["alt", "e"] },
    { label: "Share screen", keys: ["alt", "s"] },
    { label: "Full screen", keys: ["alt", "f"] },
    { label: "Toggle mute", keys: ["alt", "m"] },
    { label: "Settings", keys: ["alt", "p"] },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="ig-modal-panel w-full max-w-[480px] rounded-panel border border-ig-border bg-ig-raised p-6 text-ig-text shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 id="call-settings-title" className="text-[16px] font-semibold">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="ig-press flex h-8 w-8 items-center justify-center rounded-full bg-ig-surface text-ig-muted hover:text-ig-text"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Device selection form */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="mic-select"
              className="mb-2 block text-[13px] font-medium text-ig-muted"
            >
              Microphone
            </label>
            <div className="relative">
              <select
                id="mic-select"
                value={selectedAudioDeviceId || ""}
                onChange={(e) => onSelectAudioDevice(e.target.value)}
                className="w-full appearance-none rounded-xl border border-ig-border bg-ig-surface px-3.5 py-2.5 pr-8 text-[14px] text-ig-text focus:border-ig-accent focus:outline-none"
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default Microphone</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ig-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="speaker-select"
              className="mb-2 block text-[13px] font-medium text-ig-muted"
            >
              Audio output
            </label>
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <select
                  id="speaker-select"
                  value={selectedAudioOutputId || ""}
                  onChange={(e) => onSelectAudioOutput(e.target.value)}
                  className="w-full appearance-none truncate rounded-xl border border-ig-border bg-ig-surface px-3.5 py-2.5 pr-8 text-[14px] text-ig-text focus:border-ig-accent focus:outline-none"
                >
                  {audioOutputDevices.length > 0 ? (
                    audioOutputDevices.map((device, idx) => (
                      <option
                        key={device.deviceId || idx}
                        value={device.deviceId}
                      >
                        {device.label || `Speaker ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default Speaker</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ig-muted">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTestSound}
                className="ig-press flex items-center gap-2 rounded-control bg-ig-accent px-3.5 py-2 text-[13px] font-medium text-ig-text hover:opacity-90"
                title={isPlayingTest ? "Stop test sound" : "Play test sound"}
              >
                {isPlayingTest ? (
                  <Square size={14} className="fill-current" />
                ) : (
                  <Play size={14} className="fill-current" />
                )}
                <span className="tabular-nums">
                  {isPlayingTest ? `${Math.ceil(12 - testProgress)}s` : "12s"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="mb-3 text-[13px] font-medium text-ig-muted">
              Keyboard shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
              {shortcuts.map((sc) => (
                <div
                  key={sc.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-ig-text">{sc.label}</span>
                  <div className="flex items-center gap-1 font-mono text-[12px] text-ig-muted">
                    {sc.keys.map((k, i) => (
                      <React.Fragment key={k}>
                        <kbd className="rounded border border-ig-border bg-ig-surface px-1.5 py-0.5 text-[11px]">
                          {k}
                        </kbd>
                        {i < sc.keys.length - 1 && (
                          <span className="text-ig-faint">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              window.open(
                "https://help.instagram.com",
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="ig-press flex items-center gap-1.5 rounded-control border border-ig-border bg-ig-surface px-4 py-2.5 text-[14px] font-medium text-ig-text hover:bg-ig-ground"
          >
            <HelpCircle size={16} />
            <span>Get help</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ig-press flex-1 rounded-control bg-ig-accent px-5 py-2.5 text-[14px] font-semibold text-ig-text hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallSettingsModal;
