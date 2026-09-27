import React, { useState, useEffect, useRef } from 'react';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [videoUrl, setVideoUrl] = useState('https://test-streams.mux.dev/x36h264/x36h264.m3u8');
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState('Готов к подключению');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const startRoom = async (isCreator: boolean) => {
    if (!roomId.trim()) return alert('Введите ID комнаты!');
    setJoined(true);
    setStatusText('Подключение камеры и микрофона...');

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (e) {
      console.error('Ошибка доступа к медиа:', e);
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, action: 'candidate', data: event.candidate }),
        });
      }
    };

    if (isCreator) {
      setStatusText('Создание комнаты... Ожидание партнера');
      const dc = pc.createDataChannel('sync');
      setupDataChannel(dc);
      dcRef.current = dc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, action: 'offer', data: offer }),
      });

      pollForAnswer(pc);
    } else {
      setStatusText('Подключение к комнате...');
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setupDataChannel(dc);
        dcRef.current = dc;
      };

      pollForOfferAndConnect(pc);
    }
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => {
      setStatusText('Соединение установлено! Связь и видео синхронизированы.');
    };
    dc.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'sync-video' && mediaVideoRef.current) {
        mediaVideoRef.current.currentTime = message.time;
        if (message.playing) {
          mediaVideoRef.current.play();
          setIsPlaying(true);
        } else {
          mediaVideoRef.current.pause();
          setIsPlaying(false);
        }
      }
    };
  };

  const pollForAnswer = (pc: RTCPeerConnection) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, action: 'get' }),
        });
        const data = await res.json();
        if (data.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          processCandidates(data.candidates, pc);
          setStatusText('Партнер подключился! Смотрите вместе.');
          clearInterval(interval);
        }
      } catch (err) {}
    }, 1500);
  };

  const pollForOfferAndConnect = (pc: RTCPeerConnection) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, action: 'get' }),
        });
        const data = await res.json();
        if (data.offer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await fetch('/api/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, action: 'answer', data: answer }),
          });

          processCandidates(data.candidates, pc);
          setStatusText('Вы в комнате! Смотрите вместе.');
          clearInterval(interval);
        }
      } catch (err) {}
    }, 1500);
  };

  const processCandidates = (candidates: any[], pc: RTCPeerConnection) => {
    if (candidates && Array.isArray(candidates)) {
      candidates.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
    }
  };

  const handlePlayPause = () => {
    if (!mediaVideoRef.current) return;
    const video = mediaVideoRef.current;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      sendSyncData(video.currentTime, false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      sendSyncData(video.currentTime, true);
    }
  };

  const sendSyncData = (time: number, playing: boolean) => {
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify({ type: 'sync-video', time, playing }));
    }
  };

  return (
    <main className="p-4 max-w-md mx-auto flex flex-col gap-4 text-white min-h-screen">
      <h1 className="text-xl font-bold text-center">Telegram Watch Party</h1>

      {!joined ? (
        <div className="flex flex-col gap-3 mt-10">
          <input
            type="text"
            placeholder="Введите название комнаты (например: date123)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="p-3 rounded bg-slate-800 border border-slate-700 text-white outline-none"
          />
          <button
            onClick={() => startRoom(true)}
            className="p-3 rounded bg-indigo-600 font-semibold hover:bg-indigo-500 cursor-pointer transition-colors"
          >
            Создать комнату
          </button>
          <button
            onClick={() => startRoom(false)}
            className="p-3 rounded bg-emerald-600 font-semibold hover:bg-emerald-500 cursor-pointer transition-colors"
          >
            Войти в комнату
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-xs text-center text-emerald-400 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            Комната: <b>#{roomId}</b> • {statusText}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative bg-black rounded overflow-hidden aspect-video">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-xs bg-black/60 px-1 rounded">Вы</span>
            </div>
            <div className="relative bg-black rounded overflow-hidden aspect-video">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-xs bg-black/60 px-1 rounded">Партнер</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Прямая ссылка на MP4 / HLS видеофайл"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="p-2 rounded bg-slate-800 border border-slate-700 text-sm outline-none"
            />
            {videoUrl && (
              <div className="flex flex-col gap-2">
                <video
                  ref={mediaVideoRef}
                  src={videoUrl}
                  className="w-full rounded aspect-video bg-black cursor-pointer"
                  onClick={handlePlayPause}
                  playsInline
                />
                <button
                  onClick={handlePlayPause}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-sm cursor-pointer transition-colors"
                >
                  {isPlaying ? 'Пауза' : 'Воспроизведение'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
