import { playOutgoingRingtone, playIncomingRingtone, playEndCallSound, playTestSound } from "../Utils/callSounds";

describe("callSounds utility", () => {
  beforeAll(() => {
    // Mock Web Audio API
    window.AudioContext = jest.fn().mockImplementation(() => ({
      state: "running",
      currentTime: 0,
      resume: jest.fn().mockResolvedValue(),
      createOscillator: jest.fn().mockReturnValue({
        type: "sine",
        frequency: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      }),
      createGain: jest.fn().mockReturnValue({
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      }),
      destination: {},
    }));
  });

  test("playOutgoingRingtone plays and stops without error", () => {
    const player = playOutgoingRingtone();
    expect(player).toBeDefined();
    expect(typeof player.stop).toBe("function");
    player.stop();
  });

  test("playIncomingRingtone plays and stops without error", () => {
    const player = playIncomingRingtone();
    expect(player).toBeDefined();
    expect(typeof player.stop).toBe("function");
    player.stop();
  });

  test("playEndCallSound plays without error", () => {
    expect(() => playEndCallSound()).not.toThrow();
  });

  test("playTestSound plays and calls progress and stops", () => {
    jest.useFakeTimers();
    const onProgress = jest.fn();
    const onEnded = jest.fn();

    const player = playTestSound({ onProgress, onEnded });
    expect(player).toBeDefined();

    jest.advanceTimersByTime(500);
    expect(onProgress).toHaveBeenCalled();

    player.stop();
    jest.useRealTimers();
  });
});
