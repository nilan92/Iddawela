import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, Text, View } from 'react-native';
import { X, ChevronLeft, ChevronRight } from './icons';
import { C, F } from '../lib/theme';
import { mediaUrl } from '../lib/api';
import { useLayout } from '../lib/hooks';

export type Photo = { id: number; thumb: string; src: string; caption?: string | null; w?: number; h?: number };

export function PhotoGrid({ photos, cols }: { photos: Photo[]; cols?: number }) {
  const { width, wide, mid } = useLayout();
  const n = cols || (wide ? 5 : mid ? 4 : 3);
  const [open, setOpen] = useState<number | null>(null);
  const gap = 8;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {photos.map((p, i) => (
          <Pressable key={p.id} onPress={() => setOpen(i)} accessibilityLabel={p.caption || 'Photo'} style={({ hovered }: any) => ({ width: `${100 / n - 1.6}%` as any, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: C.sand, opacity: hovered ? 0.88 : 1 })}>
            <Image source={{ uri: mediaUrl(p.thumb) }} style={{ width: '100%', height: '100%' }} accessibilityLabel={p.caption || 'Family photograph'} />
          </Pressable>
        ))}
      </View>
      {open != null ? <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onIndex={setOpen} /> : null}
    </View>
  );
}

export function Lightbox({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const p = photos[index];
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(12,9,7,.96)', justifyContent: 'center' }}>
        <Image source={{ uri: mediaUrl(p.src) }} resizeMode="contain" style={{ flex: 1, margin: 20, marginTop: 60, marginBottom: p.caption ? 10 : 40 }} accessibilityLabel={p.caption || 'Photo'} />
        {p.caption ? <Text style={{ color: '#E9DFCB', fontFamily: F.body, fontSize: 15, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 26 }}>{p.caption}</Text> : null}
        <Text style={{ position: 'absolute', top: 22, left: 22, color: C.goldSoft, fontFamily: F.body }}>{index + 1} / {photos.length}</Text>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: 'absolute', top: 14, right: 14, padding: 10 }}><X color="#fff" size={28} /></Pressable>
        {photos.length > 1 ? <>
          <Pressable onPress={prev} accessibilityLabel="Previous" style={{ position: 'absolute', left: 8, top: '45%', padding: 12 }}><ChevronLeft color="#fff" size={34} /></Pressable>
          <Pressable onPress={next} accessibilityLabel="Next" style={{ position: 'absolute', right: 8, top: '45%', padding: 12 }}><ChevronRight color="#fff" size={34} /></Pressable>
        </> : null}
      </View>
    </Modal>
  );
}
