import React, { useState, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { MediaCard } from './components/MediaCard';
import { AdminDashboard } from './components/AdminDashboard';
import { MediaItem, AuthState, MediaType } from './types';
import { X, Play, Download, Image as ImageIcon, Music, Share2, Calendar, Clock, ArrowUpDown } from 'lucide-react';
import { ChristianCross } from './components/Icons';
import { 
  db, 
  auth, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  onAuthStateChanged,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  isSignInWithEmailLink,
  signInWithEmailLink,
  setDoc,
  getDoc,
  handleFirestoreError,
  OperationType,
  User,
  storage,
  ref,
  deleteObject
} from './firebase';

import { VideoPlayer } from './components/VideoPlayer';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Une erreur inattendue est survenue.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || '');
        if (parsed.error && parsed.error.includes('insufficient permissions')) {
          displayMessage = `Erreur de permissions Firestore (${parsed.operationType} sur ${parsed.path}). Veuillez contacter l'administrateur.`;
        }
      } catch (e) {
        // Not JSON, use default or raw message
        if (this.state.errorInfo?.includes('insufficient permissions')) {
          displayMessage = "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
        }
      }

      return (
        <div className="min-h-screen bg-deep-black flex items-center justify-center p-4">
          <div className="glass p-8 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Oups !</h2>
            <p className="text-white/60 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="electric-gradient px-6 py-2 rounded-xl font-bold text-black"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<'all' | MediaType>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const syncUserProfile = async (currentUser: User) => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          return 'user'; // unreachable but for TS
        }

        const adminEmails = [
          "predenatjeanphenix@gmail.com",
          "stepheclerveaux@gmail.com",
          "chretiensmaptoujouretenegbibla@gmail.com"
        ];
        
        // Check if invited in Firestore
        const inviteRef = doc(db, 'admin_invites', currentUser.email || '');
        let inviteSnap;
        try {
          inviteSnap = await getDoc(inviteRef);
        } catch (err) {
          // If we can't read invites, we might not be admin yet, but we should try to read it
          // if the rules allow it for the user's own email.
          console.warn("Could not check admin_invites:", err);
          // We don't throw here to allow normal user login
        }
        
        const isHardcoded = adminEmails.includes(currentUser.email || '');
        const isInvited = inviteSnap?.exists() || false;
        
        let role: 'admin' | 'user' = (isHardcoded || isInvited) ? 'admin' : 'user';

        if (!userSnap.exists()) {
          try {
            await setDoc(userRef, {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: role,
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
          }
        } else {
          const existingData = userSnap.data();
          // If they are hardcoded or invited but database says 'user', update it
          if ((isHardcoded || isInvited) && existingData.role !== 'admin') {
            try {
              await updateDoc(userRef, { role: 'admin' });
              role = 'admin';
            } catch (err) {
              console.error("Failed to update role to admin:", err);
              role = existingData.role || 'user';
              // We don't throw here to allow the app to load at least as a user
            }
          } else {
            role = existingData.role || 'user';
          }
        }
        setUserRole(role);
        return role;
      } catch (err) {
        console.error("Error syncing user profile:", err);
        setSyncError("Erreur de synchronisation du profil.");
        return 'user';
      }
    };

    // Handle Email Link Sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Veuillez fournir votre email pour confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            setUser(result.user);
            // Sync profile and get role
            const role = await syncUserProfile(result.user);
            if (role === 'admin') setShowAdmin(true);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          })
          .catch((error) => {
            console.error("Email link sign-in error", error);
            setAuthError("Erreur lors de la connexion par lien email.");
          });
      }
    }

    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser?.email);
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        try {
          const role = await syncUserProfile(currentUser);
          console.log("User role after sync:", role);
        } catch (err) {
          console.error("Auth sync error:", err);
        }
      } else {
        setUserRole(null);
        setShowAdmin(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    // Re-subscribe when sortOrder changes
    setIsSyncing(true);
    const q = query(collection(db, 'media'), orderBy('createdAt', sortOrder));
    const unsubscribeMedia = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MediaItem[];
      setMedia(items);
      setIsSyncing(false);
      setSyncError(null);
    }, (error) => {
      console.error("Media sync error", error);
      setSyncError("Erreur de synchronisation avec la base de données.");
      setIsSyncing(false);
    });

    return () => unsubscribeMedia();
  }, [sortOrder]);

  useEffect(() => {
    if (userRole) {
      console.log("User role synchronized:", userRole);
    }
  }, [userRole]);

  const handleAddMedia = async (newItem: Omit<MediaItem, 'id'>) => {
    try {
      if (!user) return;
      await addDoc(collection(db, 'media'), {
        ...newItem,
        authorUid: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'media');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      const itemToDelete = media.find(m => m.id === id);
      if (itemToDelete) {
        // Delete from Storage if it's a Storage URL
        if (itemToDelete.url.includes('firebasestorage.googleapis.com')) {
          try {
            const fileRef = ref(storage, itemToDelete.url);
            await deleteObject(fileRef);
          } catch (e) {
            console.error("Error deleting file from storage", e);
          }
        }
        // Delete thumbnail from Storage if it's a Storage URL
        if (itemToDelete.thumbnail && itemToDelete.thumbnail.includes('firebasestorage.googleapis.com')) {
          try {
            const thumbRef = ref(storage, itemToDelete.thumbnail);
            await deleteObject(thumbRef);
          } catch (e) {
            console.error("Error deleting thumbnail from storage", e);
          }
        }
      }
      await deleteDoc(doc(db, 'media', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `media/${id}`);
    }
  };

  const handleUpdateMedia = async (id: string, updates: Partial<MediaItem>) => {
    try {
      await updateDoc(doc(db, 'media', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `media/${id}`);
    }
  };

  const filteredMedia = filter === 'all' ? media : media.filter(m => m.type === filter);

  const filterOptions = [
    { id: 'all', label: 'Tout' },
    { id: 'photo', label: 'Photos' },
    { id: 'video', label: 'Vidéos' },
    { id: 'audio', label: 'Audios' },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-deep-black selection:bg-electric-cyan selection:text-black">
      <Navbar
        isAuthenticated={!!user}
        userRole={userRole}
        showAdmin={showAdmin}
        onToggleAdmin={() => setShowAdmin(prev => !prev)}
        onAuthSuccess={() => {
          // Role will be set by syncUserProfile in the auth listener
        }}
        onLogout={() => {
          setShowAdmin(false);
        }}
      />

      <main className="max-w-7xl mx-auto pt-20 md:pt-24 pb-20 px-4 md:px-6">
        <AnimatePresence mode="wait">
          {isAuthLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
            >
              <div className="w-12 h-12 border-4 border-electric-cyan/20 border-t-electric-cyan rounded-full animate-spin" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Initialisation...</p>
            </motion.div>
          ) : showAdmin && user && userRole === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6 md:mb-12 flex flex-col items-center"
            >
              {isSyncing && (
                <div className="mb-3 px-3 py-0.5 rounded-full bg-electric-cyan/10 border border-electric-cyan/20 text-[9px] text-electric-cyan animate-pulse uppercase tracking-widest font-bold">
                  Synchronisation...
                </div>
              )}
              {syncError && (
                <div className="mb-3 px-3 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] text-red-500 uppercase tracking-widest font-bold">
                  {syncError}
                </div>
              )}
              {authError && (
                <div className="mb-3 px-3 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] text-red-500 uppercase tracking-widest font-bold">
                  {authError}
                </div>
              )}
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-2xl electric-gradient flex items-center justify-center mb-3 md:mb-6 shadow-2xl shadow-electric-cyan/20">
                <ChristianCross size={20} className="text-black md:hidden" />
                <ChristianCross size={32} className="text-black hidden md:block" />
              </div>
              <h1 className="text-xl md:text-5xl font-bold tracking-tighter mb-2 md:mb-4 px-2">
                MÉDIAS DE NOTRE <span className="electric-text italic">ÉGLISE EN LIGNE</span>
              </h1>
              <p className="text-white/40 text-[8px] md:text-base max-w-2xl mx-auto uppercase tracking-[0.15em] font-medium px-4">
                Contenu multimédia haut de gamme • Administration sécurisée.
              </p>
            </motion.div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 md:mb-16">
              <div className="glass p-1 rounded-full flex gap-1 md:gap-2">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id as any)}
                    className={`relative px-3 md:px-10 py-1.5 md:py-3.5 rounded-full text-[10px] md:text-base font-bold transition-colors ${
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

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="glass px-4 py-2 md:py-3.5 rounded-full flex items-center gap-2 text-[10px] md:text-sm font-bold text-white/60 hover:text-white transition-colors border border-white/5"
              >
                <ArrowUpDown size={14} className="text-electric-cyan" />
                <span>{sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}</span>
              </button>
            </div>

            {/* Media Grid */}
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8"
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

            {filteredMedia.length === 0 && !isSyncing && (
              <div className="text-center py-20 text-white/20">
                <p className="text-xl">Aucun média trouvé dans cette catégorie.</p>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
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

                  <div className="flex gap-4 mt-8">
                    <motion.a
                      href={previewItem.url}
                      download
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 electric-gradient py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2"
                    >
                      <Download size={20} />
                      Télécharger
                    </motion.a>

                    <motion.button
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: previewItem.title,
                              text: `Découvrez ce contenu sur EDJJ Media : ${previewItem.title}`,
                              url: previewItem.url,
                            });
                          } else {
                            await navigator.clipboard.writeText(previewItem.url);
                            alert("Lien copié dans le presse-papier !");
                          }
                        } catch (error) {
                          console.error("Error sharing", error);
                        }
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <Share2 size={24} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-16 border-t border-white/5 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tighter opacity-40">
          <ChristianCross size={14} className="text-electric-cyan" />
          <span>EDJJ<span className="electric-text">MEDIA</span></span>
        </div>
        <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase">
          © 2026 EDJJ MEDIA • TOUS DROITS RÉSERVÉS
        </p>
      </footer>
      </div>
    </ErrorBoundary>
  );
}
