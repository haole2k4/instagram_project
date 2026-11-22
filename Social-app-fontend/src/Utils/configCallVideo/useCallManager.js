import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";
import webSocketService from "../../Service/webSocketService";
import {
  playOutgoingRingtone,
  playEndCallSound,
  playTestSound,
} from "../callSounds";

const MAX_GROUP_PARTICIPANTS = 5;

export function useCallManager({
  currentUser,
  conversationId,
  isGroup,
  targetUser,
  initialHasVideo = true,
  autoJoin = false,
  onCallEnded,
}) {
  const [callState, setCallState] = useState("LOBBY"); // "LOBBY" | "CALLING" | "CONNECTED" | "ENDED"
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialHasVideo);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState(null);
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState(null);
  const [audioDeviceLabel, setAudioDeviceLabel] = useState("");

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const ringtonePlayerRef = useRef(null);
  const isCleaningUpRef = useRef(false);
  const hasAutoJoinedRef = useRef(false);

  const currentUserRef = useRef(currentUser);
  const targetUserRef = useRef(targetUser);
  const isGroupRef = useRef(isGroup);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const conversationIdRef = useRef(conversationId);

  currentUserRef.current = currentUser;
  targetUserRef.current = targetUser;
  isGroupRef.current = isGroup;
  isVideoEnabledRef.current = isVideoEnabled;
  conversationIdRef.current = conversationId;

  const stopTracks = useCallback((stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn("Error stopping track:", e);
      }
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

      setAudioDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);

      if (audioInputs.length > 0 && !selectedAudioDeviceId) {
        setSelectedAudioDeviceId(audioInputs[0].deviceId);
        setAudioDeviceLabel(audioInputs[0].label || "Analog Audio Controller");
      }
      if (audioOutputs.length > 0 && !selectedAudioOutputId) {
        setSelectedAudioOutputId(audioOutputs[0].deviceId);
      }
    } catch (e) {
      console.warn("Cannot enumerate devices:", e);
    }
  }, [selectedAudioDeviceId, selectedAudioOutputId]);

  const initLocalStream = useCallback(
    async (withVideo = isVideoEnabledRef.current, audioDeviceId = null) => {
      if (!navigator?.mediaDevices?.getUserMedia) return null;
      try {
        const constraints = {
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: withVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
        };

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn(
            "Could not get requested media, trying audio only fallback:",
            err
          );
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setIsVideoEnabled(false);
        }

        if (localStreamRef.current) {
          stopTracks(localStreamRef.current);
        }
        localStreamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack && audioTrack.label) {
          setAudioDeviceLabel(audioTrack.label);
        }

        await refreshDevices();
        return stream;
      } catch (error) {
        console.error("Failed to access media devices:", error);
        return null;
      }
    },
    [stopTracks, refreshDevices]
  );

  useEffect(() => {
    isCleaningUpRef.current = false;
    const peers = peersRef.current;
    initLocalStream(initialHasVideo);
    return () => {
      if (ringtonePlayerRef.current) {
        ringtonePlayerRef.current.stop();
        ringtonePlayerRef.current = null;
      }
      peers.forEach((peer) => {
        try {
          peer.destroy();
        } catch (e) {}
      });
      peers.clear();
      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
      }
      if (screenStreamRef.current) {
        stopTracks(screenStreamRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupCall = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.stop();
      ringtonePlayerRef.current = null;
    }

    peersRef.current.forEach((peer) => {
      try {
        peer.destroy();
      } catch (e) {
        console.warn("Error destroying peer:", e);
      }
    });
    peersRef.current.clear();
    setParticipants([]);

    if (localStreamRef.current) {
      stopTracks(localStreamRef.current);
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
    }

    playEndCallSound();
    setCallState("ENDED");
    if (onCallEnded) onCallEnded();
  }, [stopTracks, onCallEnded]);

  const createPeer = useCallback(
    (remoteUserId, initiator, remoteInfo = {}) => {
      const existingPeer = peersRef.current.get(String(remoteUserId));
      if (existingPeer) {
        try {
          existingPeer.destroy();
        } catch (e) {}
        peersRef.current.delete(String(remoteUserId));
      }

      const stream = screenStreamRef.current || localStreamRef.current;
      const peer = new Peer({
        initiator,
        trickle: false,
        stream,
      });

      peer.on("signal", (signalData) => {
        const user = currentUserRef.current;
        webSocketService
          .sendVideoSignal(remoteUserId, {
            action: "signal",
            conversationId: conversationIdRef.current,
            signal: signalData,
            name: user?.userFullname,
            userImage: user?.userImage,
            hasVideo: isVideoEnabledRef.current,
          })
          .catch((e) => console.warn("Failed to send WebRTC signal:", e));
      });

      peer.on("stream", (remoteStream) => {
        setParticipants((prev) => {
          const existing = prev.find((p) => p.id === String(remoteUserId));
          if (existing) {
            return prev.map((p) =>
              p.id === String(remoteUserId)
                ? { ...p, stream: remoteStream, ...remoteInfo }
                : p
            );
          }
          return [
            ...prev,
            {
              id: String(remoteUserId),
              name: remoteInfo.name || "User",
              image: remoteInfo.image || "/default-avatar.png",
              stream: remoteStream,
              isMuted: false,
              isCameraOff: !remoteInfo.hasVideo,
            },
          ];
        });
        setCallState("CONNECTED");
        if (ringtonePlayerRef.current) {
          ringtonePlayerRef.current.stop();
          ringtonePlayerRef.current = null;
        }
      });

      peer.on("close", () => {
        peersRef.current.delete(String(remoteUserId));
        setParticipants((prev) =>
          prev.filter((p) => p.id !== String(remoteUserId))
        );
        if (!isGroupRef.current) {
          cleanupCall();
        }
      });

      peer.on("error", (err) => {
        console.warn(`Peer error with ${remoteUserId}:`, err);
      });

      peersRef.current.set(String(remoteUserId), peer);
      return peer;
    },
    [cleanupCall]
  );

  const startCall = useCallback(
    async ({ isAnswering = false } = {}) => {
      if (!currentUserRef.current?.id || !conversationIdRef.current) return;

      isCleaningUpRef.current = false;

      if (!localStreamRef.current) {
        await initLocalStream(isVideoEnabledRef.current);
      }

      const user = currentUserRef.current;
      const threadId = conversationIdRef.current;

      if (!isGroupRef.current) {
        const toUserId =
          targetUserRef.current?.userId || targetUserRef.current?.id;
        if (!toUserId) return;

        setCallState("CALLING");

        if (isAnswering) {
          // Answering an incoming call: notify caller we are ready and wait as responder (initiator: false)
          webSocketService
            .sendVideoSignal(toUserId, {
              action: "call-accept",
              conversationId: threadId,
              name: user.userFullname,
              userImage: user.userImage,
              hasVideo: isVideoEnabledRef.current,
            })
            .catch((err) => console.error("Error sending call-accept:", err));
        } else {
          ringtonePlayerRef.current = playOutgoingRingtone();
          webSocketService
            .sendVideoSignal(toUserId, {
              action: "call-invite",
              conversationId: threadId,
              name: user.userFullname,
              userImage: user.userImage,
              hasVideo: isVideoEnabledRef.current,
            })
            .catch((err) => console.error("Error sending call-invite:", err));
        }
      } else {
        setCallState("CONNECTED");
        webSocketService
          .sendGroupVideoSignal(threadId, {
            action: "group-join",
            conversationId: threadId,
            name: user.userFullname,
            userImage: user.userImage,
            hasVideo: isVideoEnabledRef.current,
          })
          .catch((err) => console.error("Error sending group-join:", err));
      }
    },
    [initLocalStream]
  );

  // Auto join once when answering an incoming call after target/group metadata loads
  useEffect(() => {
    const targetReady =
      isGroup || Boolean(targetUser?.userId || targetUser?.id);
    if (
      autoJoin &&
      !hasAutoJoinedRef.current &&
      callState === "LOBBY" &&
      currentUser?.id &&
      conversationId &&
      targetReady
    ) {
      hasAutoJoinedRef.current = true;
      startCall({ isAnswering: true });
    }
  }, [
    autoJoin,
    callState,
    currentUser?.id,
    conversationId,
    isGroup,
    targetUser,
    startCall,
  ]);

  // Listen to incoming STOMP video signals (registered once per user/call session)
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const unsubscribe = webSocketService.on("video-call", (payload) => {
      if (!payload) return;
      const { from, action, signal, name, userImage, hasVideo } = payload;
      const fromId = String(from);

      if (fromId === String(currentUserRef.current?.id)) return;

      // Incoming call invitations belong to IncomingCallModal (websocket.js), not CallPage
      if (action === "call-invite" || action === "group-call-ring") {
        return;
      }

      if (action === "endCall" || action === "group-leave") {
        const peer = peersRef.current.get(fromId);
        if (peer) {
          try {
            peer.destroy();
          } catch (e) {}
          peersRef.current.delete(fromId);
        }
        setParticipants((prev) => prev.filter((p) => p.id !== fromId));

        if (
          !isGroupRef.current &&
          fromId ===
            String(targetUserRef.current?.userId || targetUserRef.current?.id)
        ) {
          cleanupCall();
        }
        return;
      }

      if (action === "call-reject") {
        if (!isGroupRef.current) {
          cleanupCall();
        }
        return;
      }

      if (action === "call-accept" && !isGroupRef.current) {
        if (ringtonePlayerRef.current) {
          ringtonePlayerRef.current.stop();
          ringtonePlayerRef.current = null;
        }
        createPeer(fromId, true, {
          name:
            name ||
            targetUserRef.current?.userFullname ||
            targetUserRef.current?.name ||
            "User",
          image:
            userImage ||
            targetUserRef.current?.userImage ||
            targetUserRef.current?.image ||
            "/default-avatar.png",
          hasVideo: hasVideo ?? true,
        });
        return;
      }

      if (action === "group-join") {
        if (peersRef.current.size >= MAX_GROUP_PARTICIPANTS) {
          return;
        }
        createPeer(fromId, true, {
          name: name || "User",
          image: userImage || "/default-avatar.png",
          hasVideo: !!hasVideo,
        });
        return;
      }

      if (action === "signal" && signal) {
        let peer = peersRef.current.get(fromId);
        if (!peer) {
          peer = createPeer(fromId, false, {
            name: name || "User",
            image: userImage || "/default-avatar.png",
            hasVideo: !!hasVideo,
          });
        }

        try {
          peer.signal(signal);
        } catch (error) {
          console.warn("Peer signal failed:", error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, createPeer, cleanupCall]);

  const endCall = useCallback(() => {
    if (!isGroup && (targetUser?.userId || targetUser?.id)) {
      const toId = targetUser.userId || targetUser.id;
      webSocketService
        .sendVideoSignal(toId, {
          action: "endCall",
          conversationId,
        })
        .catch(() => {});
    } else if (isGroup && conversationId) {
      webSocketService
        .sendGroupVideoSignal(conversationId, {
          action: "group-leave",
          conversationId,
        })
        .catch(() => {});
    }

    cleanupCall();
  }, [isGroup, targetUser, conversationId, cleanupCall]);

  const toggleVideo = useCallback(async () => {
    const nextState = !isVideoEnabled;
    setIsVideoEnabled(nextState);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = nextState;
      } else if (nextState && navigator?.mediaDevices?.getUserMedia) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          const newTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newTrack);

          peersRef.current.forEach((peer) => {
            try {
              peer.replaceTrack(null, newTrack, localStreamRef.current);
            } catch (e) {
              console.warn("replaceTrack error:", e);
            }
          });
        } catch (e) {
          console.warn("Could not get video track:", e);
          setIsVideoEnabled(false);
        }
      }
    }
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    const nextState = !isAudioEnabled;
    setIsAudioEnabled(nextState);

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = nextState;
      }
    }
  }, [isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          try {
            peer.replaceTrack(
              peer.streams[0]?.getVideoTracks()[0],
              camTrack,
              localStreamRef.current
            );
          } catch (e) {}
        });
      }
    } else if (navigator?.mediaDevices?.getDisplayMedia) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            peersRef.current.forEach((peer) => {
              try {
                peer.replaceTrack(screenTrack, camTrack, localStreamRef.current);
              } catch (e) {}
            });
          }
        };

        peersRef.current.forEach((peer) => {
          try {
            const oldTrack =
              peer.streams[0]?.getVideoTracks()[0] ||
              localStreamRef.current?.getVideoTracks()[0];
            peer.replaceTrack(oldTrack, screenTrack, localStreamRef.current);
          } catch (e) {
            console.warn("Error replacing screen track:", e);
          }
        });
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
        setIsScreenSharing(false);
      }
    }
  }, [isScreenSharing, stopTracks]);

  const selectAudioDevice = useCallback(
    async (deviceId) => {
      setSelectedAudioDeviceId(deviceId);
      await initLocalStream(isVideoEnabled, deviceId);
    },
    [initLocalStream, isVideoEnabled]
  );

  const selectAudioOutput = useCallback((deviceId) => {
    setSelectedAudioOutputId(deviceId);
  }, []);

  const testSpeaker = useCallback(() => {
    playTestSound({ deviceId: selectedAudioOutputId });
  }, [selectedAudioOutputId]);

  return {
    callState,
    localStream: screenStreamRef.current || localStreamRef.current,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    participants,
    audioDevices,
    audioOutputDevices,
    selectedAudioDeviceId,
    selectedAudioOutputId,
    audioDeviceLabel,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    selectAudioDevice,
    selectAudioOutput,
    testSpeaker,
  };
}
