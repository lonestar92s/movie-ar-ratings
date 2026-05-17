import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useTextRecognition } from '@/hooks/useTextRecognition';
import { useRatings } from '@/hooks/useRatings';
import { RatingCard } from '@/components/RatingCard';
import { TitlePicker } from '@/components/TitlePicker';
import { DetectedTitle } from '@/types';

type UIState = 'idle' | 'processing' | 'picking' | 'rating';

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const { recognizeFromUri, processing } = useTextRecognition();
  const { data: ratings, loading: ratingsLoading, error: ratingsError, lookup, clear } = useRatings();

  const [uiState, setUiState] = useState<UIState>('idle');
  const [detectedTitles, setDetectedTitles] = useState<DetectedTitle[]>([]);

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is needed to scan your screen.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>No camera found.</Text>
      </View>
    );
  }

  async function handleTap() {
    if (uiState !== 'idle' || !cameraRef.current) return;

    setUiState('processing');
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const uri = `file://${photo.path}`;
      const titles = await recognizeFromUri(uri);

      if (titles.length === 0) {
        Alert.alert('Nothing detected', 'Point at a title in a streaming grid or carousel and try again.');
        setUiState('idle');
        return;
      }

      if (titles.length === 1) {
        // Single title — skip picker, go straight to ratings
        setUiState('rating');
        await lookup(titles[0].text);
      } else {
        setDetectedTitles(titles);
        setUiState('picking');
      }
    } catch {
      Alert.alert('Error', 'Could not capture or process the image.');
      setUiState('idle');
    }
  }

  async function handleTitleSelect(title: string) {
    setUiState('rating');
    await lookup(title);
  }

  function handleDismiss() {
    clear();
    setDetectedTitles([]);
    setUiState('idle');
  }

  const isIdle = uiState === 'idle';

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isIdle || uiState === 'processing'}
        photo
      />

      {/* Tap target — full screen when idle */}
      {isIdle && (
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTap} activeOpacity={1}>
          <View style={styles.hintContainer}>
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                {processing ? 'Scanning…' : 'Tap anywhere to identify titles'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Processing indicator */}
      {uiState === 'processing' && (
        <View style={styles.hintContainer}>
          <View style={styles.hint}>
            <Text style={styles.hintText}>Scanning…</Text>
          </View>
        </View>
      )}

      {/* Bottom sheet: title picker */}
      {uiState === 'picking' && (
        <View style={styles.bottomSheet}>
          <TitlePicker
            titles={detectedTitles}
            onSelect={handleTitleSelect}
            onDismiss={handleDismiss}
          />
        </View>
      )}

      {/* Bottom sheet: rating card */}
      {uiState === 'rating' && (
        <View style={styles.bottomSheet}>
          <RatingCard
            ratings={ratings}
            loading={ratingsLoading}
            error={ratingsError}
            onDismiss={handleDismiss}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionText: { color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 16 },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: { color: '#000', fontWeight: '600', fontSize: 15 },
  hintContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60,
  },
  hint: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  hintText: { color: '#fff', fontSize: 14 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
