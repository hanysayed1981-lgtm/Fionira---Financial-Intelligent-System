import fs from 'fs';
import path from 'path';
const stats = fs.statSync(path.join(process.cwd(), 'fonts/Cairo-Regular.ttf'));
console.log('Cairo-Regular.ttf size:', stats.size);
