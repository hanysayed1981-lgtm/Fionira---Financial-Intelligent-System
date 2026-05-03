import fs from 'fs';
import path from 'path';
const buf = fs.readFileSync(path.join(process.cwd(), 'fonts/Cairo-Regular.ttf'));
console.log(buf.slice(0, 50).toString('hex'));
