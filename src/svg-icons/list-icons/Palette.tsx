import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { IconProps } from '../../types';

export const PaletteIcon = ({ stroke = '#858585' }: IconProps): JSX.Element => {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7.029 3 3 7.029 3 12C3 16.971 7.029 21 12 21C13.105 21 14 20.105 14 19C14 18.48 13.8 18.01 13.48 17.65C13.17 17.3 12.98 16.84 12.98 16.34C12.98 15.24 13.87 14.35 14.97 14.35H16.5C18.985 14.35 21 12.335 21 9.85C21 6.05 16.97 3 12 3Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="12" r="1" fill={stroke} />
      <Circle cx="10" cy="8" r="1" fill={stroke} />
      <Circle cx="14.5" cy="8" r="1" fill={stroke} />
    </Svg>
  );
};
