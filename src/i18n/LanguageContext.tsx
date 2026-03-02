import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      return saved === 'id' ? 'id' : 'en';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Dispatch event for components that need to know
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for components outside of React tree (like electron main)
export function getStoredLanguage(): Language {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    return saved === 'id' ? 'id' : 'en';
  }
  return 'en';
}

export default LanguageContext;
