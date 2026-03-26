import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, LayoutDashboard, LogOut, Home, Eye, EyeOff } from 'lucide-react';
import { ChristianCross } from './Icons';
import { auth, googleProvider, signInWithPopup, signOut, sendSignInLinkToEmail, ActionCodeSettings } from '../firebase';

interface NavbarProps {
  onAuthSuccess: () => void;
  isAuthenticated: boolean;
  userRole: 'admin' | 'user' | null;
  onLogout: () => void;
  showAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAuthSuccess, isAuthenticated, userRole, onLogout, showAdmin, onToggleAdmin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithPopup(auth, googleProvider);
      onAuthSuccess();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Login error", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Ce domaine n'est pas autorisé dans la console Firebase.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Le pop-up a été bloqué par votre navigateur.");
      } else {
        setError("Erreur de connexion : " + (err.message || "Inconnue"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    const actionCodeSettings: ActionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (err: any) {
      console.error("Email link error", err);
      setError("Erreur lors de l'envoi de l'email : " + (err.message || "Inconnue"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 md:px-6 py-2 md:py-4 ${
          isScrolled ? 'bg-anthracite/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => showAdmin ? onToggleAdmin() : null}
            className={`flex items-center gap-1.5 md:gap-2 text-lg md:text-2xl font-bold tracking-tighter ${showAdmin ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="p-1 md:p-1.5 rounded-lg electric-gradient">
              <ChristianCross size={16} className="text-black md:hidden" />
              <ChristianCross size={20} className="text-black hidden md:block" />
            </div>
            <span>EDJJ<span className="electric-text">MEDIA</span></span>
          </motion.button>

          <div className="flex items-center gap-2 md:gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 md:gap-4">
                {userRole === 'admin' && (
                  <button
                    onClick={onToggleAdmin}
                    className={`p-1.5 md:p-2 rounded-full glass hover:bg-white/10 transition-colors ${showAdmin ? 'bg-white/10' : ''}`}
                    title={showAdmin ? "Retour à l'accueil" : "Dashboard Admin"}
                  >
                    {showAdmin ? (
                      <Home size={18} className="text-electric-cyan md:hidden" />
                    ) : (
                      <LayoutDashboard size={18} className="text-electric-cyan md:hidden" />
                    )}
                    {showAdmin ? (
                      <Home size={20} className="text-electric-cyan hidden md:block" />
                    ) : (
                      <LayoutDashboard size={20} className="text-electric-cyan hidden md:block" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="p-1.5 md:p-2 rounded-full glass hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} className="text-red-500 md:hidden" />
                  <LogOut size={20} className="text-red-500 hidden md:block" />
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 md:p-2 rounded-full glass hover:bg-white/10 transition-colors"
              >
                <Key size={18} className="text-electric-cyan md:hidden" />
                <Key size={20} className="text-electric-cyan hidden md:block" />
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                x: error ? [0, -10, 10, -10, 10, 0] : 0,
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ x: { duration: 0.4 } }}
              className="relative w-full max-w-md glass p-8 rounded-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 electric-gradient" />
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>

                <h2 className="text-2xl font-bold mb-2">Accès Administrateur</h2>
                <p className="text-white/60 text-sm mb-6">Connectez-vous pour gérer le contenu.</p>

                <div className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                      <p className="text-red-500 text-xs text-center font-medium">{error}</p>
                    </div>
                  )}

                  {linkSent ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                      <p className="text-green-400 text-sm font-bold mb-2">Email envoyé !</p>
                      <p className="text-white/40 text-xs">Veuillez vérifier votre boîte de réception ({email}) pour vous connecter.</p>
                      <button 
                        onClick={() => setLinkSent(false)}
                        className="mt-4 text-xs text-electric-cyan hover:underline"
                      >
                        Renvoyer ou changer d'email
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-4">
                        <button 
                          onClick={() => setAuthMethod('google')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMethod === 'google' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                          Google
                        </button>
                        <button 
                          onClick={() => setAuthMethod('email')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMethod === 'email' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                          Email Link
                        </button>
                      </div>

                      {authMethod === 'google' ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleGoogleLogin}
                          disabled={isLoading}
                          className="w-full electric-gradient py-4 rounded-xl font-bold text-black flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-electric-cyan/20"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          ) : (
                            <>
                              <Key size={20} />
                              SE CONNECTER AVEC GOOGLE
                            </>
                          )}
                        </motion.button>
                      ) : (
                        <form onSubmit={handleEmailLinkLogin} className="space-y-4">
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="votre@email.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-electric-cyan transition-colors text-sm"
                          />
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isLoading || !email}
                            className="w-full electric-gradient py-4 rounded-xl font-bold text-black flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-electric-cyan/20"
                          >
                            {isLoading ? (
                              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                              <>
                                <Key size={20} />
                                ENVOYER LE LIEN
                              </>
                            )}
                          </motion.button>
                        </form>
                      )}
                    </>
                  )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
