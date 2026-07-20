import { Icon, Label, NativeTabs, NativeTabTrigger } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { DynamicColorIOS } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs tintColor={DynamicColorIOS({ light: '#007AFF', dark: '#0A84FF' })}>
      <NativeTabTrigger name="index">
        <Label>总览</Label>
        <Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabTrigger>
      <NativeTabTrigger name="accounts">
        <Label>账号</Label>
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
      </NativeTabTrigger>
      <NativeTabTrigger name="register">
        <Label>注册</Label>
        <Icon sf={{ default: 'plus.bubble', selected: 'plus.bubble.fill' }} />
      </NativeTabTrigger>
      <NativeTabTrigger name="settings">
        <Label>设置</Label>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabTrigger>
    </NativeTabs>
  );
}
