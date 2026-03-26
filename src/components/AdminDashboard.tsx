import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Plus, Trash2, CheckCircle2, Search, Settings, FileText, AlertTriangle, Edit2, Check } from 'lucide-react';
import { MediaItem, MediaType } from '../types';

interface AdminDashboardProps {
  onClose: () => void;
  mediaItems: MediaItem[];
  onAdd: (item: Omit<MediaItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<MediaItem>) => void;
  onDelete: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, mediaItems, onAdd, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('manage');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '' });
  
  const [newMedia, setNewMedia] = useState({
    title: '',
    type: 'photo' as MediaType,
    url: '',
    thumbnail: '',
    category: ''
  });

  const handleEditStart = (item: MediaItem) => {
    setEditingId(item.id);
    setEditForm({ title: item.title, category: item.category });
  };

  const handleEditSave = async (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }

    onAdd({
      ...newMedia,
      url: newMedia.url || `https://picsum.photos/seed/${Date.now()}/800/600`,
      thumbnail: newMedia.thumbnail || `https://picsum.photos/seed/${Date.now()}/400/300`
    });

    setIsUploading(false);
    setUploadProgress(0);
    setNewMedia({ title: '', type: 'photo', url: '', thumbnail: '', category: '' });
    setActiveTab('manage');
  };

  const filteredItems = mediaItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full bg-anthracite border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-[80vh]"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="text-electric-cyan" size={32} />
            Administration
          </h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-2">Gestion du contenu EDJJ Media • Espace Sécurisé</p>
        </div>
        <button 
          onClick={onClose} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm font-bold border border-white/10"
        >
          <X size={18} />
          Quitter l'admin
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6 bg-black/10">
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-4 text-sm font-bold transition-all relative ${
            activeTab === 'manage' ? 'text-electric-cyan' : 'text-white/40 hover:text-white'
          }`}
        >
          Gérer les médias
          {activeTab === 'manage' && (
            <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 electric-gradient" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-6 py-4 text-sm font-bold transition-all relative ${
            activeTab === 'add' ? 'text-electric-cyan' : 'text-white/40 hover:text-white'
          }`}
        >
          Ajouter du contenu
          {activeTab === 'add' && (
            <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 electric-gradient" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'add' ? (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass p-6 rounded-2xl border-white/10">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Plus size={20} className="text-electric-cyan" />
                  Nouveau Média
                </h3>
                
                <form onSubmit={handleUpload} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Titre du média</label>
                      <input
                        required
                        value={newMedia.title}
                        onChange={e => setNewMedia({ ...newMedia, title: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                        placeholder="Ex: Culte du Dimanche"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Type de contenu</label>
                      <select
                        value={newMedia.type}
                        onChange={e => setNewMedia({ ...newMedia, type: e.target.value as MediaType })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors appearance-none"
                      >
                        <option value="photo">Photo</option>
                        <option value="video">Vidéo</option>
                        <option value="audio">Audio</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Catégorie</label>
                    <input
                      required
                      value={newMedia.category}
                      onChange={e => setNewMedia({ ...newMedia, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                      placeholder="Ex: Prédication, Louange, Événement"
                    />
                  </div>

                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:border-electric-cyan/30 transition-all cursor-pointer group bg-white/5">
                    <div className="p-4 rounded-full bg-white/5 group-hover:bg-electric-cyan/10 transition-colors">
                      <Upload size={32} className="text-white/20 group-hover:text-electric-cyan transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">Glissez-déposez vos fichiers</p>
                      <p className="text-xs text-white/40 mt-1">MP4, MP3, JPG, PNG (Max 500MB)</p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-3 p-4 glass rounded-xl border-electric-cyan/20">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-electric-cyan animate-pulse" />
                          Téléchargement en cours...
                        </span>
                        <span className="text-electric-cyan">{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full electric-gradient shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full electric-gradient py-4 rounded-xl font-bold text-black hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        Publier sur le site
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="manage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un média par titre ou catégorie..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                />
              </div>

              {/* Media List */}
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-20 glass rounded-2xl border-dashed border-white/10">
                    <FileText size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/40">Aucun média ne correspond à votre recherche.</p>
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div key={item.id} className="glass p-4 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-all border-white/5 hover:border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                          <img src={item.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={16} className="text-white" />
                          </div>
                        </div>
                        <div>
                          {editingId === item.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:border-electric-cyan outline-none transition-all"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white/60 focus:border-electric-cyan outline-none transition-all"
                              />
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-sm">{item.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-electric-cyan/10 text-electric-cyan uppercase tracking-widest font-bold border border-electric-cyan/20">
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">{item.category}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                          {editingId === item.id ? (
                            <motion.div
                              key="edit-actions"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-2"
                            >
                              <button
                                onClick={() => handleEditSave(item.id)}
                                className="p-2.5 text-green-400 hover:bg-green-500/10 rounded-xl transition-all"
                                title="Sauvegarder"
                              >
                                <Check size={20} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2.5 text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Annuler"
                              >
                                <X size={20} />
                              </button>
                            </motion.div>
                          ) : deleteConfirmId === item.id ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center gap-2"
                            >
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => {
                                  onDelete(item.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={14} />
                                Confirmer
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="default-actions"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-1"
                            >
                              <button
                                onClick={() => handleEditStart(item)}
                                className="p-2.5 text-white/20 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-xl transition-all"
                                title="Modifier ce média"
                              >
                                <Edit2 size={20} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-2.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Supprimer ce média"
                              >
                                <Trash2 size={20} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-white/10 bg-black/20 flex items-center justify-between text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Système Opérationnel
        </div>
        <div>v1.2.0-stable</div>
      </div>
    </motion.div>
  );
};
