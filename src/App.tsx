import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { MediaCard } from './components/MediaCard';
import { AdminDashboard } from './components/AdminDashboard';
import { MediaItem, AuthState, MediaType } from './types';
import { X, Play, Download, Image as ImageIcon, Music } from 'lucide-react';

import { VideoPlayer } from './components/VideoPlayer';

export default function App() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<'all' | MediaType>('all');
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, token: null });
  const [showAdmin, setShowAdmin] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    const res = await fetch('/api/media');
    const data = await res.json();
    setMedia(data);
  };

  const handleAddMedia = async (newItem: Omit<MediaItem, 'id'>) => {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    if (res.ok) fetchMedia();
  };

  const handleDeleteMedia = async (id: string) => {
    const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
    if (res.ok) fetchMedia();
  };

  const handleUpdateMedia = async (id: string, updates: Partial<MediaItem>) => {
    const res = await fetch(`/api/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchMedia();
  };

  const filteredMedia = filter === 'all' ? media : media.filter(m => m.type === filter);

  const filterOptions = [
    { id: 'all', label: 'Tout' },
    { id: 'photo', label: 'Photos' },
    { id: 'video', label: 'Vidéos' },
    { id: 'audio', label: 'Audios' },
  ];

  return (
    <div className="min-h-screen bg-deep-black selection:bg-electric-cyan selection:text-black">
      <Navbar
        isAuthenticated={auth.isAuthenticated}
        showAdmin={showAdmin}
        onToggleAdmin={() => setShowAdmin(prev => !prev)}
        onAuthSuccess={(token) => {
          setAuth({ isAuthenticated: true, token });
          setShowAdmin(true);
        }}
        onLogout={() => {
          setAuth({ isAuthenticated: false, token: null });
          setShowAdmin(false);
        }}
      />

      <main className="max-w-7xl mx-auto pt-24 pb-20 px-6">
        {showAdmin && auth.isAuthenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AdminDashboard
              onClose={() => setShowAdmin(false)}
              mediaItems={media}
              onAdd={handleAddMedia}
              onUpdate={handleUpdateMedia}
              onDelete={handleDeleteMedia}
            />
          </motion.div>
        ) : (
          <>
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
                TÉLÉCHARGER LES MÉDIAS DE NOTRE <span className="electric-text italic">ÉGLISE EN LIGNE</span>
              </h1>
            </motion.div>

            {/* Filter Bar */}
            <div className="flex justify-center mb-16">
              <div className="glass p-1.5 rounded-full flex gap-2">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id as any)}
                    className={`relative px-10 py-3.5 rounded-full text-base font-bold transition-colors ${
                      filter === opt.id ? 'text-black' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {filter === opt.id && (
                      <motion.div
                        layoutId="filter-bg"
                        className="absolute inset-0 electric-gradient rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid */}
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredMedia.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MediaCard item={item} onPreview={setPreviewItem} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredMedia.length === 0 && (
              <div className="text-center py-20 text-white/20">
                <p className="text-xl">Aucun média trouvé dans cette catégorie.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItem(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl glass rounded-2xl overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 z-10 p-2 glass rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col md:flex-row h-full max-h-[80vh]">
                <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
                  {previewItem.type === 'video' ? (
                    <VideoPlayer src={previewItem.url} />
                  ) : previewItem.type === 'audio' ? (
                    <div className="flex flex-col items-center gap-8 p-12">
                      <div className="w-48 h-48 rounded-2xl glass flex items-center justify-center relative overflow-hidden">
                        <img src={previewItem.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="" referrerPolicy="no-referrer" />
                        <Music size={64} className="text-electric-cyan relative z-10" />
                      </div>
                      <audio src={previewItem.url} controls className="w-full max-w-md" />
                    </div>
                  ) : (
                    <img src={previewItem.url} alt={previewItem.title} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  )}
                </div>
                
                <div className="w-full md:w-80 p-8 border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {previewItem.type === 'photo' && <ImageIcon size={16} className="text-electric-cyan" />}
                      {previewItem.type === 'video' && <Play size={16} className="text-electric-cyan" />}
                      {previewItem.type === 'audio' && <Music size={16} className="text-electric-cyan" />}
                      <span className="text-[10px] uppercase tracking-widest text-white/40">{previewItem.type}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{previewItem.title}</h2>
                    <p className="text-sm text-white/60 mb-6">Catégorie: {previewItem.category}</p>
                    
                    <div className="space-y-4">
                      <div className="glass p-4 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Résolution</p>
                        <p className="text-sm font-medium">4K Ultra HD</p>
                      </div>
                      <div className="glass p-4 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Licence</p>
                        <p className="text-sm font-medium">EDJJ Premium</p>
                      </div>
                    </div>
                  </div>

                  <motion.a
                    href={previewItem.url}
                    download
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-8 w-full electric-gradient py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Télécharger
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-10 border-t border-white/5 text-center text-white/20 text-xs tracking-widest uppercase">
        © 2026 EDJJ MEDIA • TOUS DROITS RÉSERVÉS
      </footer>
    </div>
  );
}
