import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Image as ImageIcon, Music, Download, Maximize2, Volume2 } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaCardProps {
  item: MediaItem;
  onPreview: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onPreview }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (item.type === 'video' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col gap-4"
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onPreview(item)}
        className="relative group aspect-[4/3] rounded-xl overflow-hidden glass cursor-pointer"
      >
        {/* Media Content */}
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110">
          {item.type === 'video' ? (
            <>
              <img
                src={item.thumbnail}
                alt={item.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                referrerPolicy="no-referrer"
              />
              <video
                ref={videoRef}
                src={item.url}
                muted
                loop
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

        {/* Type Icon */}
        <div className="absolute top-4 left-4 p-2 rounded-lg glass">
          {item.type === 'photo' && <ImageIcon size={16} className="text-electric-cyan" />}
          {item.type === 'video' && <Play size={16} className="text-electric-cyan" />}
          {item.type === 'audio' && <Music size={16} className="text-electric-cyan" />}
        </div>

        {/* Audio Spectrum Animation */}
        {item.type === 'audio' && isHovered && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [10, 30, 10] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-electric-cyan rounded-full"
              />
            ))}
          </div>
        )}

        {/* Info Overlay (Floating) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="font-bold text-sm truncate">{item.title}</h3>
          <p className="text-[10px] text-white/60 uppercase tracking-widest mt-1">{item.category}</p>
        </div>
      </div>

      {/* Action Buttons Below */}
      <div className="flex gap-2">
        <motion.button
          onClick={() => onPreview(item)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 glass border-white/10 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300"
        >
          {item.type === 'photo' ? (
            <>
              <Maximize2 size={16} />
              Aperçu
            </>
          ) : (
            <>
              <Play size={16} />
              Lire
            </>
          )}
        </motion.button>

        <motion.a
          href={item.url}
          download
          whileHover={{ scale: 1.02, opacity: 0.9 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 electric-gradient py-2.5 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 shadow-lg shadow-electric-cyan/20 transition-all duration-300"
        >
          <Download size={16} />
          Télécharger
        </motion.a>
      </div>
    </motion.div>
  );
};
