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
