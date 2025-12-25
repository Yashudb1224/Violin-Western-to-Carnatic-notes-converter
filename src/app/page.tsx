'use client';

import { ScrollingNotation } from '@/components/ScrollingNotation';
import { SimpleNoteFinder } from '@/components/SimpleNoteFinder';
import { SheetMusicUpload } from '@/components/SheetMusicUpload';
import { useState } from 'react';

export default function Home() {
  const [uploadedNotes, setUploadedNotes] = useState('');

  return (
    <main className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Carnatic Violin Notation
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main scrolling view - takes most space */}
          <div className="lg:col-span-3 space-y-6">
            <SheetMusicUpload onScoreLoaded={setUploadedNotes} />
            <ScrollingNotation uploadedNotes={uploadedNotes} />
          </div>
          
          {/* Simple finder sidebar */}
          <div className="lg:col-span-1">
            <SimpleNoteFinder />
          </div>
        </div>
      </div>
    </main>
  );
}
