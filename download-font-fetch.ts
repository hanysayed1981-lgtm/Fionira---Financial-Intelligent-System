import fs from 'fs';
import path from 'path';

async function download() {
  try {
    // A known good direct link to Tajawal Regular from cdnjs or jsdelivr? No, jsdelivr can serve from npm or github.
    // Let's use gh:
    const res = await fetch('https://cdn.jsdelivr.net/gh/googlefonts/AmiriFont@master/Amiri-Regular.ttf');
    if (!res.ok) throw new Error(res.statusText + ' ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(process.cwd(), 'fonts/Amiri-Regular.ttf'), buffer);
    console.log('Downloaded Amiri from jsdelivr, size:', buffer.length);
  } catch (err) {
    console.error('Error fetching font:', err);
  }
}

download();
