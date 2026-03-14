
import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { Language } from '../types';
import { UI_STRINGS } from '../constants';

interface Props {
  language: Language;
}

const Auth: React.FC<Props> = ({ language }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = UI_STRINGS[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-6">
      <div className="max-w-md w-full bg-white p-12 shadow-[0_40px_100px_rgba(0,0,0,0.05)] border-[0.5px] border-[#1C1C1C]/5 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-12">
          <h1 className="serif text-4xl text-[#1C1C1C] mb-4 tracking-tighter uppercase">
            {isLogin ? (language === Language.HE ? 'כניסה' : 'Iniciar Sesión') : (language === Language.HE ? 'הרשמה' : 'Registrarse')}
          </h1>
          <div className="w-12 h-[1px] bg-[#8B7355] mx-auto"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">
              {language === Language.HE ? 'אימייל' : 'Correo Electrónico'}
            </label>
            <input
              type="email"
              required
              className="w-full bg-[#F5F5F0] border-none p-4 outline-none focus:ring-1 focus:ring-[#8B7355] transition-all text-sm font-light italic"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">
              {language === Language.HE ? 'סיסמה' : 'Contraseña'}
            </label>
            <input
              type="password"
              required
              className="w-full bg-[#F5F5F0] border-none p-4 outline-none focus:ring-1 focus:ring-[#8B7355] transition-all text-sm font-light italic"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1C1C1C] text-white font-bold py-5 text-xs uppercase tracking-[0.4em] hover:bg-[#8B7355] shadow-2xl transition-all disabled:opacity-50"
          >
            {loading ? '...' : (isLogin ? (language === Language.HE ? 'התחבר' : 'Entrar') : (language === Language.HE ? 'צור חשבון' : 'Crear Cuenta'))}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#8B7355] hover:text-[#1C1C1C] text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            {isLogin 
              ? (language === Language.HE ? 'אין לך חשבון? הירשם כאן' : '¿No tienes cuenta? Regístrate') 
              : (language === Language.HE ? 'כבר יש לך חשבון? התחבר' : '¿Ya tienes cuenta? Entra')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
