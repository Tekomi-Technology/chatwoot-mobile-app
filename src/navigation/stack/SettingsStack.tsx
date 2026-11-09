import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsScreen from '@/screens/settings/SettingsScreen';
import { AppearanceScreen } from '@/screens/settings/AppearanceScreen';

export type SettingsStackParamList = {
  SettingsScreen: undefined;
  AppearanceScreen: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack = () => {
  return (
    <Stack.Navigator initialRouteName="SettingsScreen">
      <Stack.Screen
        options={{ headerShown: false }}
        name="SettingsScreen"
        component={SettingsScreen}
      />
      <Stack.Screen
        options={{ headerShown: false }}
        name="AppearanceScreen"
        component={AppearanceScreen}
      />
    </Stack.Navigator>
  );
};
