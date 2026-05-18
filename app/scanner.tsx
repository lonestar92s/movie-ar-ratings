import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { useTextRecognition } from '@/hooks/useTextRecognition';
import { useRatings } from '@/hooks/useRatings';
import { TitlePicker } from '@/components/TitlePicker';
import { LookupCandidate } from '@/types';
import { addToHistory } from '@/store/historyStore';
import { viewPointToImagePoint } from '@/utils/viewToImageCoords';

type UIState = 'idle' | 'processing' | 'picking-candidates' | 'fetching';

export default function ScannerScreen() {
  const router = useRouter();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const viewSize = useRef({ width: 0, height: 0 });

  const { recognizeFromUri } = useTextRecognition();
  const { lookup, pickCandidate, candidates } = useRatings();

  const [uiState, setUiState] = useState<UIState>('idle');

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera access is required to scan your screen.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No camera found.</Text>
      </View>
    );
  }

  function handleViewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    viewSize.current = { width, height };
  }

  async function handleTap(event: GestureResponderEvent) {
    if (uiState !== 'idle' || !cameraRef.current) return;

    const { locationX, locationY } = event.nativeEvent;
    const { width: viewWidth, height: viewHeight } = viewSize.current;
    if (viewWidth === 0 || viewHeight === 0) return;

    setUiState('processing');
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const tap = viewPointToImagePoint(
        locationX,
        locationY,
        viewWidth,
        viewHeight,
        photo.width,
        photo.height,
      );

      const titles = await recognizeFromUri(`file://${photo.path}`, {
        x: tap.x,
        y: tap.y,
        imageWidth: photo.width,
        imageHeight: photo.height,
      });

      if (titles.length === 0) {
        Alert.alert(
          'No title found',
          'Tap directly on the title text you want ratings for.',
        );
        setUiState('idle');
        return;
      }

      await handleOcrTitleSelect(titles[0].text);
    } catch {
      Alert.alert('Error', 'Could not process the image.');
      setUiState('idle');
    }
  }

  async function handleOcrTitleSelect(title: string) {
    setUiState('fetching');
    const { data, candidates: picks, error } = await lookup(title);

    if (data) {
      await addToHistory(data);
      router.push({ pathname: '/rating', params: { data: JSON.stringify(data) } });
      setUiState('idle');
    } else if (picks.length > 0) {
      setUiState('picking-candidates');
    } else {
      Alert.alert('Not found', error ?? `Could not find ratings for "${title}". Try again.`);
      setUiState('idle');
    }
  }

  async function handleCandidateSelect(match: LookupCandidate) {
    setUiState('fetching');
    const result = await pickCandidate(match);
    if (result) {
      await addToHistory(result);
      router.push({ pathname: '/rating', params: { data: JSON.stringify(result) } });
    } else {
      Alert.alert('Not found', `Could not load ratings for "${match.title}".`);
    }
    setUiState('idle');
  }

  const isActive = uiState === 'idle' || uiState === 'processing';

  return (
    <View style={styles.container} onLayout={handleViewLayout}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo
      />

      {(uiState === 'processing' || uiState === 'fetching') && (
        <View style={styles.dimOverlay} />
      )}

      {uiState === 'idle' && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
          <View style={styles.hintContainer} pointerEvents="none">
            <View style={styles.hint}>
              <Text style={styles.hintText}>Tap the title you want ratings for</Text>
            </View>
          </View>
        </Pressable>
      )}

      {(uiState === 'processing' || uiState === 'fetching') && (
        <View style={styles.hintContainer}>
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              {uiState === 'processing' ? 'Reading title…' : 'Fetching ratings…'}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backIcon}>‹</Text>
        <Text style={styles.backLabel}>Home</Text>
      </TouchableOpacity>

      {uiState === 'picking-candidates' && candidates.length > 0 && (
        <View style={styles.bottomSheet}>
          <TitlePicker
            titles={candidates.map(c => ({
              text: `${c.title} (${c.year})`,
              bounds: { x: 0, y: 0, width: 0, height: 0 },
            }))}
            onSelect={(label) => {
              const match = candidates.find(c => label.startsWith(c.title));
              if (match) handleCandidateSelect(match);
            }}
            onDismiss={() => setUiState('idle')}
            heading="Did you mean…"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0a0a0a' },
  message: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: '#000', fontWeight: '600', fontSize: 15 },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  hintContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60 },
  hint: { backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  hintText: { color: '#fff', fontSize: 14 },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backIcon: { color: '#fff', fontSize: 22, lineHeight: 24, marginRight: 2 },
  backLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
