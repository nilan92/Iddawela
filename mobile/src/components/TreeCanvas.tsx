import React, { forwardRef, useImperativeHandle } from 'react';
import { Text, View } from 'react-native';
import type { N } from '../lib/treeLayout';
export type CanvasHandle = { zoom: (f: number) => void; fit: () => void; flyTo: (id: number, k?: number) => void };
// Native fallback: the interactive canvas is web-first; native apps get the searchable list in the tree screen.
const TreeCanvas = forwardRef<CanvasHandle, any>(function TreeCanvas(_p, ref) {
  useImperativeHandle(ref, () => ({ zoom: () => {}, fit: () => {}, flyTo: () => {} }));
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Open the tree on the web for the interactive view.</Text></View>;
});
export default TreeCanvas;
