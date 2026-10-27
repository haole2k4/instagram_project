/**
 * Tiện ích âm thanh cho cuộc gọi bằng Web Audio API thuần túy.
 * Không cần file mp3 bên ngoài, hoạt động mượt mà trên mọi trình duyệt.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Âm thanh chuông gọi đi (Ringing tone)
 */
export function playOutgoingRingtone() {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let isPlaying = true;
  let timer = null;

  const playBurst = () => {
    if (!isPlaying) return;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.3);
      osc2.stop(ctx.currentTime + 1.3);
    } catch (e) {
      console.warn("Error playing outgoing ringtone:", e);
    }

    if (isPlaying) {
      timer = setTimeout(playBurst, 3500);
    }
  };

  playBurst();

  return {
    stop: () => {
      isPlaying = false;
      if (timer) clearTimeout(timer);
    },
  };
}

/**
 * Âm thanh chuông gọi đến (Incoming ringtone)
 */
export function playIncomingRingtone() {
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let isPlaying = true;
  let timer = null;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  const playChimeSequence = () => {
    if (!isPlaying) return;
    try {
      notes.forEach((freq, index) => {
        const startTime = ctx.currentTime + index * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch (e) {
      console.warn("Error playing incoming ringtone:", e);
    }

    if (isPlaying) {
      timer = setTimeout(playChimeSequence, 2000);
    }
  };

  playChimeSequence();

  return {
    stop: () => {
      isPlaying = false;
      if (timer) clearTimeout(timer);
    },
  };
}

/**
 * Âm thanh ngắt máy (End call sound)
 */
export function playEndCallSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const freqs = [480, 400, 320];
    freqs.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.11);
    });
  } catch (e) {
    console.warn("Error playing end call sound:", e);
  }
}

/**
 * Âm thanh test thiết bị 12s (như trong hình Settings của Instagram)
 */
export function playTestSound({ onProgress, onEnded, deviceId } = {}) {
  const ctx = getAudioContext();
  if (!ctx) {
    if (onEnded) onEnded();
    return { stop: () => {} };
  }

  let isPlaying = true;
  let interval = null;
  const duration = 12; // 12 seconds
  const startTimestamp = Date.now();

  const melody = [440, 554.37, 659.25, 880, 659.25, 554.37];
  let noteIndex = 0;
  let noteTimer = null;

  const playNote = () => {
    if (!isPlaying) return;
    try {
      const freq = melody[noteIndex % melody.length];
      noteIndex++;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Error playing test note:", e);
    }

    if (isPlaying) {
      noteTimer = setTimeout(playNote, 500);
    }
  };

  playNote();

  interval = setInterval(() => {
    const elapsed = Math.min(duration, (Date.now() - startTimestamp) / 1000);
    if (onProgress) {
      onProgress(elapsed);
    }
    if (elapsed >= duration) {
      stop();
      if (onEnded) onEnded();
    }
  }, 100);

  const stop = () => {
    isPlaying = false;
    if (interval) clearInterval(interval);
    if (noteTimer) clearTimeout(noteTimer);
  };

  return { stop };
}
