'use client';

import React, { useState } from 'react';
import { MiniAppProvider } from '@/context/MiniAppContext';
import { MainApp } from '@/components/MainApp';
import { WebsiteHome } from '@/components/WebsiteHome';

export default function Home() {
  const [surfaceMode, setSurfaceMode] = useState<'miniapp' | 'website'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'miniapp') {
        return 'miniapp';
      }
    }
    // Default to full-screen website for all browser/desktop visits!
    return 'website';
  });

  return (
    <MiniAppProvider>
      {surfaceMode === 'website' ? (
        <WebsiteHome onSwitchToMiniApp={() => setSurfaceMode('miniapp')} />
      ) : (
        <MainApp onSwitchToWebsite={() => setSurfaceMode('website')} />
      )}
    </MiniAppProvider>
  );
}
