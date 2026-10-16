'use client';

import React, { createContext, useContext, useState } from 'react';
import { translations, Language } from '@/locales/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLang = localStorage.getItem('TirfMarket_lang') as Language;
        if (savedLang && (savedLang === 'en' || savedLang === 'am' || savedLang === 'om' || savedLang === 'ti')) {
          return savedLang;
        }
      } catch (e) {
        console.warn("localStorage access denied", e);
      }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('TirfMarket_lang', lang);
    } catch (e) {
      console.warn("localStorage access denied", e);
    }
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
