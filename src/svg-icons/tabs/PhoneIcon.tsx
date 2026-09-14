import React from 'react';
import Svg, { Path } from 'react-native-svg';

const path =
  'M31.6 24.8c-1.2 0-2.3-.2-3.4-.5a1.9 1.9 0 0 0-1.9.4l-2.1 2.1a14.3 14.3 0 0 1-6.9-6.9l2.1-2.1c.5-.5.7-1.2.4-1.9-.3-1.1-.5-2.2-.5-3.4 0-1-.8-1.8-1.8-1.8h-3.3c-1 0-1.8.8-1.8 1.8 0 10.5 8.5 19 19 19 1 0 1.8-.8 1.8-1.8v-3.1c0-1-.8-1.8-1.8-1.8Z';

export const PhoneIconOutline = () => (
  <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
    <Path
      d={path}
      stroke="#171717"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PhoneIconFilled = () => (
  <Svg width="49" height="40" viewBox="0 0 49 40" fill="none">
    <Path d={path} fill="#171717" />
  </Svg>
);
