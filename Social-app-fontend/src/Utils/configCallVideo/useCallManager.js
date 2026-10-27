import { useState, useEffect, useRef, useCallback } from "react";
import Peer from "simple-peer";
import webSocketService from "../../Service/WebSocketService";
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
  const [participants, setParticipants] = useState([]); // [{ id, name, image, stream, isMuted, isCameraOff }]
  const [audioDevices, setAudioDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState(null);
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState(null);
  const [audioDeviceLabel, setAudioDeviceLabel] = useState("");

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // participantId -> Peer instance
  const ringtonePlayerRef = useRef(null);
  const isCleaningUpRef = useRef(false);

  // Stop media stream utility
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

  // Enumerate audio & video devices
  const refreshDevices = useCallback(async () => {
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

  // Initialize local camera and mic
  const initLocalStream = useCallback(async (withVideo = isVideoEnabled, audioDeviceId = null) => {
    try {
      const constraints = {
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
        video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };

      // If user requested audio only or video failed, fallback gracefully
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Could not get requested media, trying audio only fallback:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsVideoEnabled(false);
      }

      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
      }
      localStreamRef.current = stream;

      // Update audio device label from active track
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
  }, [isVideoEnabled, stopTracks, refreshDevices]);

  // Initialize media on mount
  useEffect(() => {
    initLocalStream(initialHasVideo);
    return () => {
      if (localStreamRef.current) {
        stopTracks(localStreamRef.current);
      }
      if (screenStreamRef.current) {
        stopTracks(screenStreamRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup all peers and connections
  const cleanupCall = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Stop ringtone if playing
    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.stop();
      ringtonePlayerRef.current = null;
    }

    // Destroy all peer connections
    peersRef.current.forEach((peer) => {
      try {
        peer.destroy();
      } catch (e) {
        console.warn("Error destroying peer:", e);
      }
    });
    peersRef.current.clear();
    setParticipants([]);

    // Stop streams
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

  // Create WebRTC Peer connection
  const createPeer = useCallback((remoteUserId, initiator, remoteInfo = {}) => {
    const stream = screenStreamRef.current || localStreamRef.current;
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
    });

    peer.on("signal", (signalData) => {
      webSocketService.sendVideoSignal(remoteUserId, {
        action: "signal",
        conversationId,
        signal: signalData,
        name: currentUser?.userFullname,
        userImage: currentUser?.userImage,
        hasVideo: isVideoEnabled,
      }).catch((e) => console.warn("Failed to send WebRTC signal:", e));
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
      setParticipants((prev) => prev.filter((p) => p.id !== String(remoteUserId)));
      if (!isGroup) {
        cleanupCall();
      }
    });

    peer.on("error", (err) => {
      console.warn(`Peer error with ${remoteUserId}:`, err);
    });

    peersRef.current.set(String(remoteUserId), peer);
    return peer;
  }, [conversationId, currentUser, isVideoEnabled, isGroup, cleanupCall]);

  // Start Call (from Lobby)
  const startCall = useCallback(async () => {
    if (!currentUser?.id || !conversationId) return;

    if (!localStreamRef.current) {
      await initLocalStream(isVideoEnabled);
    }

    if (!isGroup) {
      // 1-on-1 Call
      const toUserId = targetUser?.userId || targetUser?.id;
      if (!toUserId) return;

      setCallState("CALLING");
      ringtonePlayerRef.current = playOutgoingRingtone();

      // Send call invite to remote user
      webSocketService.sendVideoSignal(toUserId, {
        action: "call-invite",
        conversationId,
        name: currentUser.userFullname,
        userImage: currentUser.userImage,
        hasVideo: isVideoEnabled,
      }).catch((err) => console.error("Error sending call-invite:", err));

      // Create initiator peer
      createPeer(toUserId, true, {
        name: targetUser.userFullname || targetUser.name,
        image: targetUser.userImage || targetUser.image,
        hasVideo: isVideoEnabled,
      });
    } else {
      // Group Call
      setCallState("CONNECTED");

      // Broadcast join to conversation
      webSocketService.sendGroupVideoSignal(conversationId, {
        action: "group-join",
        conversationId,
        name: currentUser.userFullname,
        userImage: currentUser.userImage,
        hasVideo: isVideoEnabled,
      }).catch((err) => console.error("Error sending group-join:", err));
    }
  }, [
    currentUser,
    conversationId,
    isGroup,
    targetUser,
    isVideoEnabled,
    initLocalStream,
    createPeer,
  ]);

  // Handle auto join if arriving from incoming call modal
  useEffect(() => {
    if (autoJoin && callState === "LOBBY") {
      startCall();
    }
  }, [autoJoin, callState, startCall]);

  // Listen to incoming STOMP video signals
  useEffect(() => {
    const unsubscribe = webSocketService.on("video-call", (payload) => {
      if (!payload) return;
      const { from, action, signal, name, userImage, hasVideo } = payload;
      const fromId = String(from);

      // Ignore signals from self
      if (fromId === String(currentUser?.id)) return;

      if (action === "endCall" || action === "group-leave") {
        const peer = peersRef.current.get(fromId);
        if (peer) {
          try {
            peer.destroy();
          } catch (e) {}
          peersRef.current.delete(fromId);
        }
        setParticipants((prev) => prev.filter((p) => p.id !== fromId));

        if (!isGroup && fromId === String(targetUser?.userId || targetUser?.id)) {
          cleanupCall();
        }
        return;
      }

      if (action === "call-reject") {
        if (!isGroup) {
          cleanupCall();
        }
        return;
      }

      if (action === "group-join") {
        if (peersRef.current.size >= MAX_GROUP_PARTICIPANTS) {
          // Group call limit reached
          return;
        }
        // New member joined the group -> initiate peer connection to them
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
          // Received offer as responder
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
  }, [currentUser?.id, targetUser, isGroup, createPeer, cleanupCall]);

  // End Call
  const endCall = useCallback(() => {
    if (!isGroup && (targetUser?.userId || targetUser?.id)) {
      const toId = targetUser.userId || targetUser.id;
      webSocketService.sendVideoSignal(toId, {
        action: "endCall",
        conversationId,
      }).catch(() => {});
    } else if (isGroup && conversationId) {
      webSocketService.sendGroupVideoSignal(conversationId, {
        action: "group-leave",
        conversationId,
      }).catch(() => {});
    }

    cleanupCall();
  }, [isGroup, targetUser, conversationId, cleanupCall]);

  // Toggle Video Track
  const toggleVideo = useCallback(async () => {
    const nextState = !isVideoEnabled;
    setIsVideoEnabled(nextState);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = nextState;
      } else if (nextState) {
        // Need to acquire video track
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          const newTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newTrack);

          // Update peers with new video track
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

  // Toggle Audio Track
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

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing, restore camera
      if (screenStreamRef.current) {
        stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          try {
            peer.replaceTrack(peer.streams[0]?.getVideoTracks()[0], camTrack, localStreamRef.current);
          } catch (e) {}
        });
      }
    } else {
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

        // Replace track for all peers
        peersRef.current.forEach((peer) => {
          try {
            const oldTrack = peer.streams[0]?.getVideoTracks()[0] || localStreamRef.current?.getVideoTracks()[0];
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

  // Select Audio Input Device
  const selectAudioDevice = useCallback(async (deviceId) => {
    setSelectedAudioDeviceId(deviceId);
    await initLocalStream(isVideoEnabled, deviceId);
  }, [initLocalStream, isVideoEnabled]);

  // Select Audio Output Device
  const selectAudioOutput = useCallback((deviceId) => {
    setSelectedAudioOutputId(deviceId);
  }, []);

  // Test Speaker
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
