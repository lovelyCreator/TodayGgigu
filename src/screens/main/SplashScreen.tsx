import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';

// 기동 화면 로고 — todayGgigu wordmark (276×56 원본). 가로형이므로 비율 유지.
const WORDMARK_WIDTH = 220;
const WORDMARK_HEIGHT = Math.round((WORDMARK_WIDTH * 56) / 276); // ≈ 45

const SplashScreen: React.FC = () => {
  // 로그인 상태는 라우팅 결정에 쓰일 수 있어 hook 호출은 유지.
  useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  // 3개 붉은점 staggered fade — 흐르는 듯한 효과.
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 로고 fade-in + scale-up 을 병렬 실행.
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // 3개 점 각각을 200ms 씩 delay 를 두고 무한 fade in/out 시켜
    // 좌→우로 흐르는 듯한 시퀀스를 만든다.
    const createDotAnimation = (dotAnim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(800),
        ]),
      );

    // 로고가 나타난 뒤 약간의 텀을 두고 도트 시퀀스 시작.
    const startDots = setTimeout(() => {
      createDotAnimation(dotAnim1, 0).start();
      createDotAnimation(dotAnim2, 200).start();
      createDotAnimation(dotAnim3, 400).start();
    }, 1000);

    return () => clearTimeout(startDots);
  }, [fadeAnim, scaleAnim, dotAnim1, dotAnim2, dotAnim3]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* 워드마크 아이콘 (todayGgiguWordmark.png) — 비율 유지하며 표시 */}
        <Image
          source={require('../../assets/images/todayGgiguWordmark.png')}
          style={{ width: WORDMARK_WIDTH, height: WORDMARK_HEIGHT }}
          resizeMode="contain"
        />

        {/* 워드마크 바로 밑에 3개 붉은점 staggered 애니메이션 */}
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
          <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    marginHorizontal: 4,
  },
});

export default SplashScreen;
