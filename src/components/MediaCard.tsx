import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Image as ImageIcon, Music, Download, Maximize2, Volume2, Share2 } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaCardProps {
  item: MediaItem;
  onPreview: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onPreview }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Découvrez ce contenu sur EDJJ Media : ${item.title}`,
          url: item.url,
        });
      } else {
        await navigator.clipboard.writeText(item.url);
        alert("Lien copié dans le presse-papier !");
      }
    } catch (error) {
      console.error("Error sharing", error);
    } finally {
      setTimeout(() => setIsSharing(false), 2000);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col rounded-2xl overflow-hidden glass border border-white/10 shadow-xl group/card"
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onPreview(item)}
        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
      >
        {/* Media Content */}
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover/card:scale-105">
          <div className="relative w-full h-full flex items-center justify-center bg-black/40">
            {/* Background Blur */}
            <img
              src={item.thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-150"
              referrerPolicy="no-referrer"
            />
            
            {item.type === 'video' ? (
              <>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className={`relative z-10 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}
                  referrerPolicy="no-referrer"
                />
                <video
                  ref={videoRef}
                  src={item.url}
                  muted
                  loop
                  playsInline
                  className={`absolute inset-0 z-10 w-full h-full object-contain transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            ) : item.type === 'audio' ? (
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <img
                  src={item.thumbnail}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                  referrerPolicy="no-referrer"
                />
                <Music size={48} className="text-electric-cyan relative z-20" />
              </div>
            ) : (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="relative z-10 w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>

        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

        {/* Type Icon */}
        <div className="absolute top-3 left-3 p-1.5 rounded-lg glass z-20">
          {item.type === 'photo' && <ImageIcon size={14} className="text-electric-cyan" />}
          {item.type === 'video' && <Play size={14} className="text-electric-cyan" />}
          {item.type === 'audio' && <Music size={14} className="text-electric-cyan" />}
        </div>

        {/* Info Overlay (Floating) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20">
          <h3 className="font-bold text-xs sm:text-sm truncate">{item.title}</h3>
          <div className="flex flex-col gap-0.5 mt-0.5">
            <p className="text-[9px] sm:text-[10px] text-white/60 uppercase tracking-widest">{item.category}</p>
            {item.originalName && (
              <p className="text-[7px] sm:text-[8px] text-white/30 truncate italic">Ref: {item.originalName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Integrated */}
      <div className="flex p-1.5 gap-1.5 bg-black/20 backdrop-blur-sm border-t border-white/5">
        <motion.button
          onClick={() => onPreview(item)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 glass border-white/5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300"
          title={item.type === 'photo' ? 'Aperçu' : 'Lire'}
        >
          {item.type === 'photo' ? <Maximize2 size={16} /> : <Play size={16} />}
          <span className="hidden sm:inline">{item.type === 'photo' ? 'Aperçu' : 'Lire'}</span>
        </motion.button>

        <motion.a
          href={item.url}
          download
          whileHover={{ scale: 1.02, opacity: 0.9 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 electric-gradient py-2 rounded-xl font-bold text-xs sm:text-sm text-black flex items-center justify-center gap-2 shadow-lg shadow-electric-cyan/20 transition-all duration-300"
          title="Télécharger"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Télécharger</span>
        </motion.a>

        <motion.button
          onClick={handleShare}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-2.5 rounded-xl border border-white/5 flex items-center justify-center transition-all duration-300 ${isSharing ? 'bg-electric-cyan text-black' : 'glass hover:bg-white/10'}`}
          title="Partager"
        >
          <Share2 size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
};
