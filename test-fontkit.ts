import fs from 'fs';
import fontkit from 'fontkit';
import path from 'path';

try {
  const font = fontkit.openSync(path.join(process.cwd(), 'fonts/Cairo-Regular.ttf'));
  console.log('Font loaded:', font.familyName, font.postscriptName);
  console.log('Advance width of "م":', font.layout('م').glyphs[0].advanceWidth);
} catch (e) {
  console.error(e.message);
}
