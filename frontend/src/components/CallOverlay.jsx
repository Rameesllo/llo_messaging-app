import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Minimize, User, X, ShieldAlert } from 'lucide-react';
import { 
  emitCall,
  emitAnswer, 
  emitIceCandidate, 
  emitEndCall, 
  emitRejectCall,
  subscribeToCallAnswered,
  subscribeToIceCandidate,
  subscribeToCallEnded,
  subscribeToCallRejected
} from '../services/socket';

const CallOverlay = ({ 
  currentUser, 
  otherUser, 
  callType, 
  isIncoming, 
  initialOffer, 
  onClose,
  onSendMessage 
}) => {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'calling');
  const statusRef = useRef(callStatus);
  useEffect(() => { statusRef.current = callStatus; }, [callStatus]);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'voice');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hardwareError, setHardwareError] = useState(null);
  
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const wasConnected = useRef(false);
  const isCleaningUp = useRef(false);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    console.log('CallOverlay mounted', { callType, isIncoming, otherUser });
    
    // Check for Secure Context (Required for Camera/Mic on IP addresses)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setHardwareError('SECURE_CONTEXT_REQUIRED');
      return;
    }

    setupCall();
    
    const unsubAnswer = subscribeToCallAnswered(({ answer }) => {
      if (peerConnection.current) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('connected');
        wasConnected.current = true;
      }
    });

    const unsubIce = subscribeToIceCandidate(({ candidate }) => {
      if (peerConnection.current) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    const unsubEnded = subscribeToCallEnded(() => {
      cleanup('Call ended by other user');
    });

    const unsubRejected = subscribeToCallRejected(() => {
        cleanup('Call rejected');
    });

    return () => {
      console.log('CallOverlay unmounting');
      unsubAnswer();
      unsubIce();
      unsubEnded();
      unsubRejected();
      cleanup();
    };
  }, []);

  const setupCall = async () => {
    if (!otherUser?._id) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
      
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          emitIceCandidate({ to: otherUser._id, candidate: event.candidate });
        }
      };

      if (!isIncoming) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        emitCall({ 
          to: otherUser._id, 
          from: currentUser, 
          offer, 
          callType 
        });
      }
    } catch (err) {
      console.error('WebRTC Setup Error:', err);
      setHardwareError(err.name === 'NotAllowedError' ? 'PERMISSION_DENIED' : 'HARDWARE_FAILED');
    }
  };

  const handleAccept = async () => {
    if (!peerConnection.current || !initialOffer || !otherUser?._id) return;
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(initialOffer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      emitAnswer({ to: otherUser._id, answer });
      setCallStatus('connected');
      wasConnected.current = true;
    } catch (err) {
      console.error('Accept Error:', err);
      cleanup('Failed to establish connection');
    }
  };

  const cleanup = (reason) => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;
    
    if (onSendMessage) {
      const typeLabel = callType.charAt(0).toUpperCase() + callType.slice(1);
      if (wasConnected.current) {
         if (!isIncoming) onSendMessage(`${typeLabel} call`, null, 'call');
      } else if (statusRef.current === 'ringing' || statusRef.current === 'calling') {
         if (!isIncoming) onSendMessage(`Missed ${typeLabel} call`, null, 'call');
      }
    }

    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (peerConnection.current) peerConnection.current.close();
    onClose();
  };

  if (!otherUser) return null;

  if (hardwareError) {
    return (
      <div className="hardware-error-overlay">
        <div className="error-card">
          <ShieldAlert size={48} color="#ef4444" />
          <h3>Hardware Access Required</h3>
          <p>
            {hardwareError === 'SECURE_CONTEXT_REQUIRED' 
              ? `You are accessing this via an IP address (${window.location.hostname}). For security reasons, browsers only allow camera and microphone access on HTTPS or localhost. If you are testing across devices, please use an HTTPS connection.`
              : hardwareError === 'PERMISSION_DENIED'
              ? "You denied camera/microphone permissions. Please click the lock icon in your browser address bar and 'Allow' access to use the calling feature."
              : "We could not access your camera or microphone. Please ensure they are connected and not being used by another app."}
          </p>
          <button onClick={() => onClose()} className="error-close-btn">Dismiss</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`call-overlay ${isMinimized ? 'minimized' : ''}`}>
      <div className="call-bg">
         <img src={otherUser?.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt="" className="call-bg-blur" />
         <div className="call-glass"></div>
      </div>

      <div className="call-content">
        {!isMinimized && (
          <button className="minimize-trigger" onClick={() => setIsMinimized(true)}>
            <Minimize size={24} />
          </button>
        )}

        <div className="call-header">
           <div className="avatar-ring">
             <img src={otherUser?.profilePicture || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt="" className="call-avatar" />
             {callStatus !== 'connected' && <div className="pulse-ring"></div>}
           </div>
           <h2 className="caller-name">{otherUser?.username || 'User'}</h2>
           <p className="call-status">
             {callStatus === 'ringing' ? 'Incoming Call' : 
              callStatus === 'calling' ? 'Calling...' : 
              'Securely Connected'}
           </p>
        </div>

        <div className="video-grid">
           {callType === 'video' && remoteStream && !isMinimized && (
             <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
           )}
           {callType === 'video' && localStream && !isMinimized && (
              <div className="local-video-container">
                <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
              </div>
           )}
           {callType === 'voice' && !isMinimized && (
             <div className="voice-call-ui">
                <div className="voice-pulse">
                   <User size={80} color="rgba(255,255,255,0.2)" />
                </div>
             </div>
           )}
        </div>

        <div className="call-footer">
          {callStatus === 'ringing' ? (
            <div className="snap-actions">
               <button onClick={() => { emitRejectCall({ to: otherUser._id }); cleanup(); }} className="snap-btn btn-reject">
                  <PhoneOff size={32} />
               </button>
               <button onClick={handleAccept} className="snap-btn btn-accept">
                  <Phone size={32} />
               </button>
            </div>
          ) : (
            <div className={`snap-actions ${isMinimized ? 'vertical' : ''}`}>
               {!isMinimized && (
                 <button onClick={() => { localStream.getAudioTracks()[0].enabled = !isMuted; setIsMuted(!isMuted); }} className={`snap-btn ${isMuted ? 'active' : ''}`}>
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                 </button>
               )}
               
               <button onClick={() => { if (otherUser?._id) emitEndCall({ to: otherUser._id }); cleanup(); }} className="snap-btn btn-reject large">
                  <PhoneOff size={32} />
               </button>

               {!isMinimized && callType === 'video' && (
                 <button onClick={() => { localStream.getVideoTracks()[0].enabled = !isVideoOff; setIsVideoOff(!isVideoOff); }} className={`snap-btn ${isVideoOff ? 'active' : ''}`}>
                   {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                 </button>
               )}

               {isMinimized && (
                 <button onClick={() => setIsMinimized(false)} className="snap-btn btn-maximize">
                   <Minimize size={24} />
                 </button>
               )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .call-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          color: white;
          display: flex;
          flex-direction: column;
          font-family: 'Outfit', sans-serif;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .call-overlay.minimized {
          inset: auto;
          top: 20px;
          right: 20px;
          width: 80px;
          height: 120px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 12px 48px rgba(0,0,0,0.5);
        }

        .call-overlay.minimized .call-header, 
        .call-overlay.minimized .video-grid { display: none; }
        .call-overlay.minimized .call-content { padding: 10px; }
        .call-overlay.minimized .snap-actions { flex-direction: column; gap: 8px; }
        .call-overlay.minimized .snap-btn { width: 36px; height: 36px; }
        .call-overlay.minimized .snap-btn svg { width: 18px; height: 18px; }

        .call-bg {
          position: absolute;
          inset: 0;
          z-index: -1;
        }

        .call-bg-blur {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(60px) brightness(0.3);
          transform: scale(1.2);
        }

        .call-glass {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%);
        }

        .call-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 80px 40px;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .minimize-trigger {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
        }

        .call-header { text-align: center; }

        .avatar-ring {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 24px;
        }

        .call-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid rgba(255,255,255,0.2);
          object-fit: cover;
          position: relative;
          z-index: 1;
        }

        .pulse-ring {
          position: absolute;
          inset: -10px;
          border: 2px solid #0ea5e9;
          border-radius: 50%;
          animation: snap-pulse 2s infinite;
        }

        @keyframes snap-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .caller-name { font-size: 32px; font-weight: 800; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .call-status { font-size: 18px; color: #0ea5e9; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

        .video-grid { flex: 1; width: 100%; position: relative; margin: 40px 0; display: flex; align-items: center; justify-content: center; }
        .remote-video { width: 100%; height: 100%; object-fit: cover; border-radius: 32px; background: #111; border: 1px solid rgba(255,255,255,0.1); }
        .local-video-container { position: absolute; top: 20px; right: 20px; width: 120px; height: 180px; border-radius: 20px; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 12px 24px rgba(0,0,0,0.5); }
        .local-video { width: 100%; height: 100%; object-fit: cover; }

        .voice-call-ui { width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        .snap-actions { display: flex; gap: 40px; align-items: center; }
        .snap-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.15);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .snap-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.25); }
        .snap-btn.btn-accept { background: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }
        .snap-btn.btn-reject { background: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
        .snap-btn.large { width: 84px; height: 84px; }
        .snap-btn.active { background: white; color: #000; }

        .hardware-error-overlay {
          position: fixed;
          inset: 0;
          z-index: 10002;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .error-card {
          background: #1e293b;
          width: 100%;
          max-width: 400px;
          padding: 32px;
          border-radius: 24px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .error-card h3 { font-size: 20px; margin: 16px 0 12px; }
        .error-card p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
        .error-close-btn { width: 100%; padding: 12px; background: #0ea5e9; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default CallOverlay;
