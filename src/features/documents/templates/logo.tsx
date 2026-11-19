import * as React from "react";
import { Svg, Path } from "@react-pdf/renderer";

import { ink } from "@/features/documents/templates/house-style";

/**
 * The agency's marks, as vector rather than raster.
 *
 * They were 1400 px PNGs placed at 75 pt and 33 pt. That looks like ten times
 * the resolution needed, but resolution was never the problem: the lettering
 * is hairline, and a stroke thinner than the output pixel grid is averaged
 * into grey however many source pixels it started with. Enlarging the PNG
 * cannot fix that, and shrinking it makes it worse.
 *
 * Drawn as paths, the strokes are resolved by the renderer at whatever
 * resolution it is drawing at — crisp on screen, crisp at 1200 dpi on paper,
 * and crisp when someone zooms in. They also weigh a few KB instead of 200,
 * on every page of every document.
 *
 * Generated from the "Noir" cuts in public/img, which stay the source of
 * truth: "logoTypo Noir" for the first page, "bstay-monogramme-noir" for the
 * footer. They replace the "BSTAYLogo" and "BSTAYFull Monogram" files, the
 * identity before this one.
 *
 * Their ink is already #111110, but the fill is taken from the palette rather
 * than restated, so the marks follow the documents if the ink is ever re-pitched.
 */
type LogoProps = {
  width: number;
  height: number;
  /**
   * The ink to draw in. Defaults to the documents' own, which is what every
   * placement on a white sheet wants.
   *
   * public/img also ships a "Blanc" cut of each mark, which is these same
   * paths with a different fill — so a prop serves it without a second asset
   * to keep in step. Pass `paper` to set the mark on a dark ground.
   */
  color?: string;
};

/**
 * The wordmark, for the masthead of a document's first page.
 *
 * 322.76 × 92.45, a little wider for its height than the lockup it replaces
 * (338.41 × 100.86), so the callers' heights changed with it: a mark sized at
 * the old ratio is stretched, since an Svg fills the box it is given.
 */
export function BstayLogo({ width, height, color = ink }: LogoProps) {
  return (
    <Svg viewBox="0 0 322.76 92.45" style={{ width, height }}>
      <Path fill={color} d="M25.67,42.59c-.5-.02-1.02.02-1.55-.05-4.6-.54-8.76-3.57-10.53-7.85-.48-1.16-.82-2.4-1-3.68-.43,3.26-1.92,6.21-4.15,8.44-2.22,2.23-5.14,3.72-8.44,4.14,3.3.43,6.22,1.96,8.44,4.19,2.23,2.22,3.72,5.14,4.15,8.44.33-2.45,1.26-4.7,2.62-6.61,2.37-3.33,6.38-5.1,10.46-5.1h0c3.22,0,6.45.24,9.59.93,15.89,3.41,28.28,12.08,28.28,21.79,0,10.59-13.12,17.73-35.41,17.73v-34.94c-4.22,0-9.1,1.54-9.1,7.53v7.92c0,10.89-.77,17.95-3.22,25.9h20.41c20.53,0,37.49-9.79,37.49-24.02,0-10.25-6.98-17.58-21.98-24.25,10.47-5.18,16.8-12.36,16.8-20.3,0-12.47-13.16-21.72-32.58-21.72H15.81c2.45,7.94,3.22,12.58,3.22,23.52v5c0,6.08,4.88,7.47,9.1,7.47V7.45c18.45,0,30.16,6.18,30.16,16,0,6.87-7.87,13.54-19.11,17.19C39.18,40.64,31.62,42.81,25.67,42.59Z" />
      <Path fill={color} d="M195.93,13.19l4.84-11h-65.01l-3.6,11.97.22.22c7.66-2.94,17.69-4.57,28.62-4.57v55.96c0,11-.68,17.86-2.81,25.58h15.2c-2.15-7.72-2.81-14.58-2.81-25.58V9.81C181.38,9.81,188.71,10.89,195.93,13.19Z" />
      <Path fill={color} d="M263.11,81.78c-1.53-2.96-3.27-6.54-5.22-11L226.74,0h-.31l-33.42,70.45c-3.9,8.17-7.68,15.02-11.48,20.59v.31h15.59c-.11-.98-.2-1.95-.2-2.94,0-3.8,1.41-8.82,4.3-15.24l6.46-14.38h35.46l5.84,14.06c3.18,7.3,4.19,11.65,4.19,15.56,0,1.21-.09,2.18-.29,2.94h15.97v-.31C266.61,87.75,264.65,84.72,263.11,81.78ZM211.46,50.52l14.66-32.56,13.53,32.56H211.46Z" />
      <Path fill={color} d="M308.23,2.19c.11.55.22,1.08.22,1.41,0,3.38-.9,6.43-3.6,10.89l-16.8,28.74-16.66-28.41c-2.7-4.68-3.84-7.73-3.84-10.69,0-.97,0-1.61.11-1.94h-16.11v.33c3.05,2.93,5.53,6.52,10.03,14.03l21.53,36.05v13.17c0,10.78-.68,17.75-2.81,25.58h15.07c-2.13-7.83-2.81-14.8-2.81-25.58v-13.83l21.4-36.48c3.4-5.76,6.32-10.01,8.8-12.94v-.33H308.23Z" />
      <Path fill={color} d="M108.25,43.23c-6.89-3.6-11.61-6.76-14.31-9.59q-4.04-4.24-4.05-9.78c0-7.63,6.86-14.71,17.57-14.71,5.97,0,10.69,1.63,16.44,6.09l.35-.11V5.01c-4.85-2.49-11.04-3.93-16.79-3.93-15.88,0-27.27,12.22-27.27,24.63,0,5.33,1.36,9.68,4.17,13.28,2.83,3.58,7.66,7.18,14.76,10.78,15.1,7.84,19.27,12.41,19.27,19.48,0,8.82-7.66,15.25-17.58,15.25-7.21,0-12.06-2.3-19.61-9.7h-.44v14.16c5.51,2.28,11.83,3.49,18.69,3.49,16.35,0,29.65-9.15,29.65-24.63C129.1,56.51,123.35,50.96,108.25,43.23Z" />
    </Svg>
  );
}

/**
 * The monogram alone, for the fixed footer: the two B's set back to back.
 *
 * Drawn from "bstay-monogramme-noir" in public/img, which replaced the
 * octagonal mark. It is not square — 77.31 × 57.11, wider than it is tall —
 * so the caller sizes both sides, at that ratio. One path, one colourway: the
 * "blanc" cut beside it is the same outline in the paper colour, which the
 * `color` prop already serves.
 */
export function BstayMonogram({ width, height, color = ink }: LogoProps) {
  return (
    <Svg viewBox="0 0 77.31 57.11" style={{ width, height }}>
      <Path fill={color} d="M63.41,26.59c6.62-3.28,10.63-7.81,10.63-12.84C74.03,5.86,65.71.02,53.43.02h-12.74c1.55,5.02,2.04,7.96,2.04,14.87v3.17c0,3.84,3.08,4.72,5.75,4.72V4.04c11.67,0,19.07,3.91,19.07,10.12,0,4.34-4.97,8.57-12.08,10.87,0,0-4.78,1.38-8.54,1.23-.31-.01-.64.01-.98-.03-2.91-.35-5.54-2.26-6.66-4.97-.15-.36-.28-.74-.38-1.12,0-.02,0-.03-.01-.05-.05-.18-.09-.35-.13-.53-.04-.21-.08-.43-.11-.65-.11.81-.33,1.59-.63,2.33-1.12,2.71-3.75,4.62-6.66,4.97-.33.04-.66.02-.98.03-3.77.14-8.54-1.23-8.54-1.23-7.11-2.31-12.08-6.53-12.08-10.87,0-6.21,7.4-10.12,19.07-10.12v18.73c2.67,0,5.75-.88,5.75-4.72v-3.17c0-6.92.49-9.85,2.04-14.87h-12.74C11.6,0,3.28,5.85,3.28,13.73c0,5.02,4,9.56,10.63,12.84C4.42,30.79,0,35.43,0,41.91c0,9,10.73,15.19,23.71,15.19h12.91c-1.55-5.02-2.04-9.49-2.04-16.38v-5.01c0-3.79-3.08-4.76-5.75-4.76v22.09c-14.1,0-22.4-4.51-22.4-11.21,0-6.14,7.84-11.62,17.88-13.78,1.99-.44,4.03-.58,6.07-.58,2.58,0,5.11,1.12,6.61,3.22.63.89,1.11,1.89,1.41,2.97.02.06.03.12.05.18.03.13.06.26.09.39.04.22.08.43.11.66.21-1.55.8-2.97,1.66-4.18,1.5-2.1,4.03-3.22,6.61-3.22,2.04,0,4.08.15,6.07.58,10.05,2.16,17.88,7.64,17.88,13.78,0,6.7-8.3,11.21-22.4,11.21v-22.09c-2.67,0-5.75.97-5.75,4.76v5.01c0,6.89-.49,11.36-2.04,16.38h12.91c12.98,0,23.71-6.19,23.71-15.19,0-6.48-4.42-11.11-13.9-15.34Z" />
    </Svg>
  );
}
