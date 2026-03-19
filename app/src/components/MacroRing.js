import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function MacroRing({ value = 0, max = 2000, label = 'kcal', color = '#2E86AB', size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, value / max);
  const strokeDashoffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);

  return (
    <View style={[s.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#EEEEEE" strokeWidth={10} fill="none" />
        {/* Progress circle */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={pct >= 100 ? '#EF5350' : color}
          strokeWidth={10}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={s.inner}>
        <Text style={[s.value, { color: pct >= 100 ? '#EF5350' : color }]}>{Math.round(value)}</Text>
        <Text style={s.label}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  inner:     { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value:     { fontSize: 20, fontWeight: '800' },
  label:     { fontSize: 11, color: '#888', marginTop: 2 },
});
