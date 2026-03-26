import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, LayoutDashboard, LogOut, Home } from 'lucide-react';

interface NavbarProps {
  onAuthSuccess: (token: string) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
  showAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAuthSuccess, isAuthenticated, onLogout, showAdmin, onToggleAdmin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput }),
      });

      const data = await response.json();

      if (data.success) {
        onAuthSuccess(data.token);
        setIsModalOpen(false);
        setKeyInput('');
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 ${
          isScrolled ? 'bg-anthracite/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => showAdmin ? onToggleAdmin() : null}
            className={`text-2xl font-bold tracking-tighter ${showAdmin ? 'cursor-pointer' : 'cursor-default'}`}
          >
            EDJJ<span className="electric-text">MEDIA</span>
          </motion.button>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={onToggleAdmin}
                  className={`p-2 rounded-full glass hover:bg-white/10 transition-colors ${showAdmin ? 'bg-white/10' : ''}`}
                  title={showAdmin ? "Retour à l'accueil" : "Dashboard Admin"}
                >
                  {showAdmin ? (
                    <Home size={20} className="text-electric-cyan" />
                  ) : (
                    <LayoutDashboard size={20} className="text-electric-cyan" />
                  )}
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} className="text-red-500" />
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
              >
                <Key size={20} className="text-electric-cyan" />
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
              <p className="text-white/60 text-sm mb-6">Veuillez saisir votre clé d'accès unique.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Clé d'accès (6-8 caractères)"
                    className={`w-full bg-white/5 border ${
                      error ? 'border-red-500' : 'border-white/10'
                    } rounded-lg px-4 py-3 focus:outline-none focus:border-electric-cyan transition-colors text-center tracking-[0.5em] font-mono`}
                    maxLength={8}
                    autoFocus
                  />
                  {error && <p className="text-red-500 text-xs mt-2 text-center">Clé invalide. Accès refusé.</p>}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="w-full electric-gradient py-3 rounded-lg font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key size={18} />
                      Vérifier la clé
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
