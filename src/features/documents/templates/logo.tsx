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
 * Generated from the Black cuts in public/img, which stay the source of truth:
 * "BSTAYLogo Big Sizes" for the first page, "BSTAYFull Monogram" for the
 * footer. The Black cuts because a document prints on the white of the sheet;
 * the White ones are for a dark ground and have no use here.
 *
 * Their ink is already #111110, but the fill is taken from the palette rather
 * than restated, so the marks follow the documents if the ink is ever re-pitched.
 *
 * One thing is dropped on the way in. Both files carry the artwork twice: once
 * in #f0ede8 under `.cls-2` and once in the ink under `.cls-1`, the same
 * `d` strings byte for byte — a duplicated colourway stacked in the export,
 * where the ink copy is drawn last and hides the other completely. Only the
 * ink layer is kept, which halves the path data and removes a layer that could
 * never be seen.
 */
type LogoProps = {
  width: number;
  height: number;
  /**
   * The ink to draw in. Defaults to the documents' own, which is what every
   * placement on a white sheet wants.
   *
   * public/img also ships a "- White" cut of each mark, which is these same
   * paths with a different fill — so a prop serves it without a second asset
   * to keep in step. Pass `paper` to set the mark on a dark ground.
   */
  color?: string;
};

/**
 * The full lockup, for the masthead of a document's first page.
 *
 * Horizontal, where the mark it replaces was vertical: 338.41 × 100.86 rather
 * than 75 × 82.5, so it is set wider and shorter and the callers' dimensions
 * change with it.
 */
export function BstayLogo({ width, height, color = ink }: LogoProps) {
  return (
    <Svg viewBox="0 0 338.41 100.86" style={{ width, height }}>
      <Path fill={color} d="M18.77,99.67H0c2.25-8.55,2.97-16.15,2.97-27.92V30.29C2.97,18.53,2.25,10.92,0,2.37h18.53c17.82,0,29.94,9.98,29.94,23.4,0,8.55-5.82,16.28-15.44,21.86,13.78,7.24,20.2,15.09,20.2,26.14,0,15.32-15.56,25.9-34.46,25.9ZM12.95,47.27c15.56-2.61,24.71-11.52,24.71-20.78,0-10.58-9.39-17.23-24.71-17.23v38.02ZM12.95,49.18v43.6c18.89,0,29.11-7.6,29.11-19.01s-11.76-21.98-29.11-24.59Z" />
      <Path fill={color} d="M83.22,81.61h.47c7.96,8.08,13.07,10.58,20.67,10.58,10.45,0,18.53-7.01,18.53-16.64,0-7.72-4.4-12.71-20.32-21.26-7.48-3.92-12.59-7.84-15.56-11.77-2.97-3.92-4.4-8.67-4.4-14.49,0-13.54,12-26.85,28.75-26.85,6.06,0,12.59,1.54,17.7,4.28v11.05l-.36.12c-6.06-4.87-11.05-6.65-17.34-6.65-11.28,0-18.53,7.72-18.53,16.04,0,4.03,1.43,7.6,4.28,10.69,2.85,3.09,7.84,6.53,15.09,10.46,15.92,8.43,21.98,14.49,21.98,26.84,0,16.87-14.02,26.85-31.24,26.85-7.25,0-13.9-1.31-19.72-3.8v-15.45Z" />
      <Path fill={color} d="M167.84,10.69c-11.53,0-22.1,1.78-30.18,4.99l-.24-.24,3.8-13.07h68.55l-5.11,12c-7.6-2.49-15.33-3.68-26.73-3.68v61.06c0,12,.72,19.49,2.97,27.92h-16.04c2.25-8.43,2.97-15.92,2.97-27.92V10.69Z" />
      <Path fill={color} d="M281.57,99.67h-16.86c.22-.83.32-1.9.32-3.21,0-4.28-1.07-9.03-4.43-16.99l-6.16-15.33h-37.39l-6.81,15.69c-3.03,7.01-4.53,12.47-4.53,16.63,0,1.07.1,2.14.21,3.21h-16.43v-.35c4-6.06,8-13.54,12.11-22.46L236.83,0h.32l32.85,77.21c2.05,4.87,3.9,8.79,5.51,12,1.62,3.21,3.68,6.53,6.05,10.1v.35ZM221.05,55.12h29.72l-14.26-35.52-15.46,35.52Z" />
      <Path fill={color} d="M338.41,2.37v.35c-2.61,3.21-5.7,7.84-9.27,14.14l-22.57,39.8v15.09c0,11.77.71,19.37,2.97,27.92h-15.91c2.25-8.55,2.97-16.15,2.97-27.92v-14.37l-22.69-39.33c-4.75-8.2-7.37-12.11-10.58-15.33v-.35h16.99c-.12.35-.12,1.07-.12,2.14,0,3.21,1.19,6.53,4.04,11.65l17.58,31.01,17.71-31.37c2.85-4.87,3.8-8.19,3.8-11.88,0-.35-.12-.95-.24-1.54h15.33Z" />
      <Path fill={color} d="M67.7,42.38c.14-.58,1.73-2.06,3.56-3.37l3.97,3.97-2.52,2.52,2.03,2.03,4.54-4.54-7.65-7.65-.97.63c-1.3.84-3.13,2.15-4.38,3.54-1.26-1.4-3.08-2.7-4.38-3.54l-.97-.63-7.65,7.65,4.54,4.54,2.03-2.03-2.52-2.52,3.97-3.97c1.83,1.31,3.42,2.78,3.56,3.31,0,1.77-5.13,6.28-9.92,9.38l-1.49.96,8.01,8.01,4.84-4.84,4.84,4.84,8.01-8.01-1.49-.96c-4.79-3.1-9.92-7.61-9.93-9.31ZM71.11,56.62l-2.65-2.65,1.7-1.7-2.03-2.03-1.86,1.86-1.95-1.95-2.03,2.03,1.79,1.79-2.65,2.65-3.49-3.49c2.44-1.68,6.27-4.56,8.33-7.37,2.06,2.81,5.89,5.7,8.33,7.37l-3.49,3.49Z" />
    </Svg>
  );
}

/** The monogram alone, for the fixed footer. Square, so width equals height. */
export function BstayMonogram({ width, height, color = ink }: LogoProps) {
  return (
    <Svg viewBox="0 0 100.86 100.86" style={{ width, height }}>
      <Path fill={color} d="M59.89,100.86h-18.92c-2.65,0-5.27-.7-7.57-2.03l-16.38-9.46c-2.3-1.33-4.21-3.24-5.54-5.54l-9.46-16.38c-1.33-2.3-2.03-4.91-2.03-7.56v-18.92c0-2.65.7-5.27,2.03-7.56l9.46-16.38c1.33-2.3,3.24-4.21,5.54-5.54L33.41,2.03C35.7.7,38.32,0,40.97,0h18.92C62.54,0,65.16.7,67.45,2.03l16.38,9.46c2.3,1.33,4.21,3.24,5.54,5.54l9.46,16.38c1.33,2.3,2.03,4.91,2.03,7.56v18.92c0,2.65-.7,5.27-2.03,7.56l-9.46,16.38c-1.32,2.3-3.24,4.21-5.54,5.54l-16.38,9.46c-2.3,1.33-4.91,2.03-7.56,2.03ZM40.97,3.43c-2.05,0-4.07.54-5.85,1.57l-16.38,9.46c-1.78,1.03-3.26,2.51-4.28,4.28l-9.46,16.38c-1.03,1.78-1.57,3.8-1.57,5.85v18.92c0,2.05.54,4.07,1.57,5.85l9.46,16.38c1.03,1.78,2.51,3.26,4.28,4.28l16.38,9.46c1.78,1.03,3.8,1.57,5.85,1.57h18.92c2.05,0,4.07-.54,5.85-1.57l16.38-9.46c1.78-1.03,3.26-2.51,4.28-4.28l9.46-16.38c1.02-1.78,1.57-3.8,1.57-5.85v-18.92c0-2.05-.54-4.07-1.57-5.85l-9.46-16.38c-1.03-1.78-2.51-3.26-4.28-4.28l-16.38-9.46c-1.78-1.03-3.8-1.57-5.85-1.57h-18.92Z" />
      <Path fill={color} d="M59.89,94.38h-18.92c-1.52,0-3.01-.4-4.33-1.16l-16.38-9.46c-1.31-.76-2.41-1.85-3.17-3.17l-9.46-16.38c-.76-1.31-1.16-2.81-1.16-4.32v-18.92c0-1.52.4-3.01,1.16-4.32l9.46-16.39c.76-1.31,1.85-2.41,3.17-3.17l16.38-9.46c1.31-.76,2.81-1.16,4.32-1.16h18.92c1.52,0,3.01.4,4.33,1.16l16.38,9.46c1.31.76,2.41,1.85,3.17,3.17l9.46,16.38c.76,1.31,1.16,2.81,1.16,4.33v18.92c0,1.52-.4,3.01-1.16,4.32l-9.46,16.38c-.76,1.31-1.85,2.41-3.16,3.17l-16.38,9.46c-1.31.76-2.81,1.16-4.32,1.16ZM40.97,9.91c-.92,0-1.82.24-2.61.7l-16.38,9.46c-.79.46-1.45,1.12-1.91,1.91l-9.46,16.38c-.46.79-.7,1.69-.7,2.61v18.92c0,.92.24,1.82.7,2.61l9.46,16.38c.46.79,1.12,1.45,1.91,1.91l16.38,9.46c.79.46,1.7.7,2.61.7h18.92c.92,0,1.82-.24,2.61-.7l16.38-9.46c.79-.46,1.45-1.12,1.91-1.91l9.46-16.38c.46-.79.7-1.7.7-2.61v-18.92c0-.92-.24-1.82-.7-2.61l-9.46-16.38c-.46-.79-1.12-1.45-1.91-1.91l-16.38-9.46c-.79-.46-1.7-.7-2.61-.7h-18.92Z" />
      <Path fill={color} d="M53.6,37.95c.31-1.29,3.84-4.59,7.92-7.49l8.83,8.83-5.6,5.6,4.5,4.5,10.1-10.1-17.02-17.02-2.16,1.4c-2.89,1.87-6.95,4.77-9.75,7.88-2.8-3.11-6.85-6.01-9.75-7.88l-2.16-1.4-17,17.02,10.09,10.1,4.5-4.5-5.59-5.6,8.82-8.83c4.07,2.9,7.61,6.18,7.91,7.36,0,3.93-11.41,13.95-22.06,20.84l-3.31,2.14,17.8,17.8,10.75-10.75,10.75,10.75,17.8-17.8-3.31-2.14c-10.65-6.89-22.06-16.91-22.07-20.71ZM61.18,69.59l-5.9-5.89,3.78-3.78-4.5-4.5-4.13,4.13-4.34-4.34-4.5,4.5,3.99,3.99-5.9,5.89-7.77-7.77c5.42-3.73,13.94-10.14,18.52-16.39,4.58,6.25,13.1,12.66,18.52,16.39l-7.77,7.77Z" />
    </Svg>
  );
}
