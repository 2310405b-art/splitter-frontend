// src/shared/ui/ScreenContainer.tsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { YStack } from 'tamagui';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface ScreenContainerProps {
  children: React.ReactNode;
}

const SPRING_CONFIG = { damping: 15, stiffness: 120 };

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  const updateZoomState = (zoomed: boolean) => {
    setIsZoomed(zoomed);
  };

  // 1. Pinch Gesture (Zoom in and out between 1x and 4x)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(1, Math.min(savedScale.value * event.scale, 4));
      scale.value = newScale;
      if (newScale > 1.05) {
        runOnJS(updateZoomState)(true);
      } else {
        runOnJS(updateZoomState)(false);
      }
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.05) {
        // Reset translation smoothly if we pinch back to normal size
        scale.value = withSpring(1, SPRING_CONFIG);
        savedScale.value = 1;
        translationX.value = withSpring(0, SPRING_CONFIG);
        translationY.value = withSpring(0, SPRING_CONFIG);
        savedTranslationX.value = 0;
        savedTranslationY.value = 0;
        runOnJS(updateZoomState)(false);
      }
    });

  // 2. Pan Gesture (Move the screen around - ONLY active when zoomed in)
  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((event) => {
      translationX.value = savedTranslationX.value + event.translationX;
      translationY.value = savedTranslationY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslationX.value = translationX.value;
      savedTranslationY.value = translationY.value;
    });

  // 3. Double Tap to smoothly reset zoom and position (ONLY active when zoomed in)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(isZoomed)
    .onStart(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
      savedScale.value = 1;
      translationX.value = withSpring(0, SPRING_CONFIG);
      translationY.value = withSpring(0, SPRING_CONFIG);
      savedTranslationX.value = 0;
      savedTranslationY.value = 0;
      runOnJS(updateZoomState)(false);
    });

  const nativeGesture = Gesture.Native();

  // Combine pinch, pan, double-tap, and native scroll gestures
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture, nativeGesture)
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <YStack
          flex={1}
          backgroundColor="$background"
          paddingHorizontal="$4"
          paddingTop="$6"
          paddingBottom="$4"
        >
          {children}
        </YStack>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});