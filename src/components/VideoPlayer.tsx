import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoPlayerProps {
  src: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
      setCurrentTime(current);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = seekTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group/player">
      <video
        ref={videoRef}
        src={src}
        className="max-w-full max-h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Custom Controls Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity duration-300">
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 mb-4 group/progress">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full electric-gradient"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-electric-cyan"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="text-xs font-mono text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) videoRef.current.volume = val;
                  if (val > 0) setIsMuted(false);
                }}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-electric-cyan"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => {
                 if (videoRef.current) {
                   videoRef.current.currentTime = 0;
                   videoRef.current.play();
                   setIsPlaying(true);
                 }
               }}
               className="p-2 hover:bg-white/10 rounded-full transition-colors"
             >
               <RotateCcw size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Big Play Button on Pause */}
      {!isPlaying && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={togglePlay}
          className="absolute p-6 rounded-full bg-electric-cyan/20 backdrop-blur-md border border-electric-cyan/30 text-electric-cyan"
        >
          <Play size={48} fill="currentColor" />
        </motion.button>
      )}
    </div>
  );
};
