import { useEffect, useRef, useState } from 'react';
import { useGetSiteSettings } from '@/api';
import { Music, Pause } from 'lucide-react';

export function MusicPlayer() {
  const { data: settings } = useGetSiteSettings();
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlist = settings?.playlist ?? [];
  const musicEnabled = settings?.musicEnabled && playlist.length > 0;

  // Browsers block unmuted autoplay until the visitor has interacted with the
  // page, so try to play immediately and, if that's rejected, start on their
  // very first tap/click/keypress anywhere on the site instead - the closest
  // thing to real autoplay that's actually allowed.
  useEffect(() => {
    if (!musicEnabled) return;
    const audio = audioRef.current;
    if (!audio) return;

    let disposed = false;
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const startOnInteraction = () => {
      void audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    audio
      .play()
      .then(() => {
        if (!disposed) setIsPlaying(true);
      })
      .catch(() => {
        if (disposed) return;
        events.forEach((event) => document.addEventListener(event, startOnInteraction, { once: true }));
      });

    return () => {
      disposed = true;
      events.forEach((event) => document.removeEventListener(event, startOnInteraction));
    };
  }, [musicEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    void audio.play().catch(() => setIsPlaying(false));
  }, [trackIndex, isPlaying]);

  if (!musicEnabled) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setTrackIndex((current) => (current + 1) % playlist.length);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={playlist[trackIndex]?.url}
        onEnded={handleEnded}
        preload="none"
      />
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        aria-label={isPlaying ? 'Pause music' : 'Play music'}
        title={isPlaying ? `Playing: ${playlist[trackIndex]?.title}` : 'Play music'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Music className="w-5 h-5" />}
      </button>
    </>
  );
}
