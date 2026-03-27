import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Plus, Trash2, CheckCircle2, Search, Settings, FileText, AlertTriangle, Edit2, Check, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import { ChristianCross } from './Icons';
import { MediaItem, MediaType } from '../types';
import { 
  db, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  handleFirestoreError, 
  OperationType,
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from '../firebase';

interface AdminDashboardProps {
  onClose: () => void;
  mediaItems: MediaItem[];
  onAdd: (item: Omit<MediaItem, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<MediaItem>) => void;
  onDelete: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, mediaItems, onAdd, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'manage' | 'users'>('add');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', originalName: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [adminInvites, setAdminInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newMedia, setNewMedia] = useState({
    title: '',
    type: 'photo' as MediaType,
    url: '',
    thumbnail: '',
    category: '',
    originalName: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen for users
    const q = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setUsers(userList);
      setUsersError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setUsersError("Erreur de connexion avec la base de données (Utilisateurs). Vérifiez vos droits d'accès.");
    });

    // Listen for admin invites
    const unsubscribeInvites = onSnapshot(collection(db, 'admin_invites'), (snapshot) => {
      const inviteList = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.id,
        role: 'admin',
        isInvite: true
      }));
      setAdminInvites(inviteList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_invites');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeInvites();
    };
  }, []);

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await setDoc(doc(db, 'admin_invites', inviteEmail.toLowerCase()), {
        invitedAt: new Date().toISOString()
      });
      setInviteEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admin_invites/${inviteEmail.toLowerCase()}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveInvite = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'admin_invites', email));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admin_invites/${email}`);
    }
  };

  const hardcodedAdmins = [
    "predenatjeanphenix@gmail.com",
    "stepheclerveaux@gmail.com",
    "chretiensmaptoujouretenegbibla@gmail.com"
  ];

  // Merge all types of admins and users
  const allUsers = [...users];
  
  // Add invited admins who haven't signed in yet
  adminInvites.forEach(invite => {
    if (!allUsers.find(u => u.email?.toLowerCase() === invite.email.toLowerCase())) {
      allUsers.push({
        id: `invite-${invite.email}`,
        email: invite.email,
        role: 'admin',
        isInvite: true,
        displayName: 'Administrateur invité'
      });
    }
  });

  // Add hardcoded admins who haven't signed in yet
  hardcodedAdmins.forEach(email => {
    if (!allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
      allUsers.push({
        id: `hardcoded-${email}`,
        email: email,
        role: 'admin',
        isHardcoded: true,
        displayName: 'Administrateur système'
      });
    }
  });

  const filteredUsers = allUsers.filter(u => 
    (u.email?.toLowerCase() || '').includes(userSearchQuery.toLowerCase()) ||
    (u.displayName?.toLowerCase() || '').includes(userSearchQuery.toLowerCase())
  );

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError(null);
      // Check file size (100MB limit as requested)
      if (file.size > 100 * 1024 * 1024) {
        setUploadError("Le fichier est trop volumineux (max 100MB).");
        return;
      }

      setIsReadingFile(true);
      setSelectedFile(file);
      
      let type: MediaType = 'photo';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      // For photos, we can still use Base64 for a quick preview, 
      // but for videos/audio we'll use object URLs for preview
      if (type === 'photo') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewMedia(prev => ({ 
            ...prev, 
            title: prev.title || file.name.split('.')[0],
            originalName: file.name,
            type,
            url: reader.result as string,
            thumbnail: reader.result as string
          }));
          setIsReadingFile(false);
        };
        reader.readAsDataURL(file);
      } else if (type === 'video') {
        const blobUrl = URL.createObjectURL(file);
        
        // Try to capture a thumbnail from the video
        const video = document.createElement('video');
        video.src = blobUrl;
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          video.currentTime = 1; // Seek to 1 second
        };
        
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnail = canvas.toDataURL('image/jpeg');
              
              setNewMedia(prev => ({ 
                ...prev, 
                title: prev.title || file.name.split('.')[0],
                originalName: file.name,
                type,
                url: blobUrl,
                thumbnail: thumbnail
              }));
            } else {
              throw new Error("Could not get canvas context");
            }
          } catch (err) {
            console.error("Thumbnail generation failed", err);
            setNewMedia(prev => ({ 
              ...prev, 
              title: prev.title || file.name.split('.')[0],
              originalName: file.name,
              type,
              url: blobUrl,
              thumbnail: `https://picsum.photos/seed/${Date.now()}/400/300`
            }));
          } finally {
            setIsReadingFile(false);
          }
        };

        video.onerror = () => {
          setNewMedia(prev => ({ 
            ...prev, 
            title: prev.title || file.name.split('.')[0],
            originalName: file.name,
            type,
            url: blobUrl,
            thumbnail: `https://picsum.photos/seed/${Date.now()}/400/300`
          }));
          setIsReadingFile(false);
        };
      } else {
        // Audio
        const blobUrl = URL.createObjectURL(file);
        setNewMedia(prev => ({ 
          ...prev, 
          title: prev.title || file.name.split('.')[0],
          originalName: file.name,
          type,
          url: blobUrl,
          thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop' // Default music thumbnail
        }));
        setIsReadingFile(false);
      }
    }
  };

  const handleEditStart = (item: MediaItem) => {
    setEditingId(item.id);
    setEditForm({ 
      title: item.title, 
      category: item.category,
      originalName: item.originalName || ''
    });
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateDoc(doc(db, 'media', id), editForm);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `media/${id}`);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Veuillez sélectionner un fichier.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      // 1. Upload file to Firebase Storage
      const storageRef = ref(storage, `media/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      // 2. Monitor upload progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error", error);
          setUploadError("Erreur lors de l'envoi au stockage : " + error.message);
          setIsUploading(false);
        }, 
        async () => {
          try {
            // 3. Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // 4. If it's a photo, we use the downloadURL as thumbnail too
            // If it's a video, we might have a Base64 thumbnail already in newMedia.thumbnail
            // We should also upload the thumbnail if it's a Base64 string to avoid Firestore limits
            let thumbnailUrl = newMedia.thumbnail;
            if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
              try {
                const thumbBlob = await (await fetch(thumbnailUrl)).blob();
                const thumbRef = ref(storage, `thumbnails/${Date.now()}_thumb.jpg`);
                await uploadBytesResumable(thumbRef, thumbBlob);
                thumbnailUrl = await getDownloadURL(thumbRef);
              } catch (thumbError) {
                console.error("Error uploading thumbnail", thumbError);
                // Fallback to downloadURL if thumbnail upload fails
                thumbnailUrl = downloadURL;
              }
            }

            // 5. Add to Firestore
            await onAdd({
              ...newMedia,
              url: downloadURL,
              thumbnail: thumbnailUrl || downloadURL
            });

            setIsUploading(false);
            setUploadProgress(0);
            setSelectedFile(null);
            setNewMedia({ title: '', type: 'photo', url: '', thumbnail: '', category: '', originalName: '' });
            setActiveTab('manage');
          } catch (error: any) {
            console.error("Error in upload completion", error);
            setUploadError("Erreur lors de la finalisation : " + (error.message || "Inconnue"));
            setIsUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error("Upload error", error);
      setUploadError("Erreur lors de la publication : " + (error.message || "Inconnue"));
      setIsUploading(false);
    }
  };

  const filteredItems = (mediaItems || []).filter(item => 
    (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  if (!mediaItems) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-electric-cyan/20 border-t-electric-cyan rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full bg-anthracite border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden min-h-[80vh]"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl electric-gradient flex items-center justify-center shadow-lg shadow-electric-cyan/20">
            <ChristianCross size={24} className="text-black" />
          </div>
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              Administration
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-2">Gestion du contenu EDJJ Media • Espace Sécurisé</p>
          </div>
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
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-4 text-sm font-bold transition-all relative ${
            activeTab === 'users' ? 'text-electric-cyan' : 'text-white/40 hover:text-white'
          }`}
        >
          Gérer les accès
          {activeTab === 'users' && (
            <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 electric-gradient" />
          )}
        </button>
      </div>

      {usersError && activeTab === 'users' && (
        <div className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500">
          <AlertTriangle size={20} />
          <p className="text-xs font-bold uppercase tracking-widest">{usersError}</p>
        </div>
      )}

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
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Titre d'affichage (Page d'accueil)</label>
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

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Catégorie</label>
                      <input
                        required
                        value={newMedia.category}
                        onChange={e => setNewMedia({ ...newMedia, category: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                        placeholder="Ex: Prédication, Louange"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Nom d'origine / Lien</label>
                      <input
                        value={newMedia.originalName}
                        onChange={e => setNewMedia({ ...newMedia, originalName: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                        placeholder="Ex: image_01.jpg ou lien source"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Lien de la miniature (Optionnel)</label>
                    <input
                      value={newMedia.thumbnail}
                      onChange={e => setNewMedia({ ...newMedia, thumbnail: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                      placeholder="Ex: https://... (Laissez vide pour auto-générer)"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Fichier Média</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,video/*,audio/*"
                    />
                    <button
                      type="button"
                      onClick={handleFileButtonClick}
                      className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group bg-white/5 ${
                        uploadError ? 'border-red-500/50 hover:border-red-500' : 'border-white/10 hover:border-electric-cyan/30'
                      }`}
                    >
                      <div className={`p-4 rounded-full bg-white/5 transition-colors ${uploadError ? 'group-hover:bg-red-500/10' : 'group-hover:bg-electric-cyan/10'}`}>
                        <Upload size={32} className={`transition-colors ${uploadError ? 'text-red-500/50 group-hover:text-red-500' : 'text-white/20 group-hover:text-electric-cyan'}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-widest">Cliquez pour UPLOADER</p>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-tighter">Sélectionnez un média depuis votre appareil</p>
                      </div>
                    </button>
                    {uploadError && (
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">{uploadError}</p>
                    )}
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
                    disabled={isUploading || isReadingFile || !newMedia.title || !newMedia.category}
                    className="w-full electric-gradient py-4 rounded-xl font-bold text-black hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Traitement... {uploadProgress}%
                      </>
                    ) : isReadingFile ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Lecture du fichier...
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
          ) : activeTab === 'users' ? (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Add Admin Form */}
              <div className="glass p-6 rounded-2xl border-white/10">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Plus size={16} className="text-electric-cyan" />
                  Ajouter un administrateur
                </h3>
                <form onSubmit={handleInviteAdmin} className="flex gap-4">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="Email du nouvel administrateur..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail}
                    className="px-6 electric-gradient rounded-xl font-bold text-black flex items-center gap-2 disabled:opacity-50"
                  >
                    {isInviting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Plus size={18} />}
                    Inviter
                  </button>
                </form>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:border-electric-cyan outline-none transition-colors"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.map(u => (
                  <div key={u.id} className="glass p-4 rounded-xl flex items-center justify-between border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden border border-white/10">
                        {u.photoURL ? (
                          <img src={u.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <UsersIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{u.displayName || 'Utilisateur sans nom'}</h4>
                          {u.isHardcoded && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 uppercase font-bold">Système</span>}
                          {u.isInvite && <span className="text-[8px] px-1.5 py-0.5 rounded bg-electric-cyan/10 text-electric-cyan uppercase font-bold">Invité</span>}
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold border ${
                          u.role === 'admin' ? 'bg-electric-cyan/10 text-electric-cyan border-electric-cyan/20' : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {u.role}
                        </span>
                        
                        {!u.isHardcoded && (
                          <button
                            onClick={() => {
                              if (u.isInvite) {
                                handleRemoveInvite(u.email);
                              } else {
                                handleRoleUpdate(u.id, u.role === 'admin' ? 'user' : 'admin');
                              }
                            }}
                            className="p-2 text-white/20 hover:text-electric-cyan hover:bg-electric-cyan/10 rounded-lg transition-all"
                            title={u.isInvite ? "Supprimer l'invitation" : (u.role === 'admin' ? "Retirer les droits admin" : "Donner les droits admin")}
                          >
                            {u.isInvite ? <Trash2 size={18} className="text-red-500" /> : (u.role === 'admin' ? <ShieldCheck size={18} className="text-electric-cyan" /> : <ShieldCheck size={18} />)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                                placeholder="Titre d'affichage"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editForm.category}
                                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white/60 focus:border-electric-cyan outline-none transition-all"
                                  placeholder="Catégorie"
                                />
                                <input
                                  type="text"
                                  value={editForm.originalName}
                                  onChange={(e) => setEditForm({ ...editForm, originalName: e.target.value })}
                                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white/40 focus:border-electric-cyan outline-none transition-all italic"
                                  placeholder="Nom d'origine"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-sm">{item.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-electric-cyan/10 text-electric-cyan uppercase tracking-widest font-bold border border-electric-cyan/20">
                                  {item.type}
                                </span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">{item.category}</span>
                                {item.originalName && (
                                  <span className="text-[9px] text-white/20 italic ml-2 truncate max-w-[150px]">
                                    ({item.originalName})
                                  </span>
                                )}
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
