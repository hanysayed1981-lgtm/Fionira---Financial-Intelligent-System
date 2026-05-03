import fs from 'fs';
import path from 'path';
console.log('Fonts dir:', path.join(process.cwd(), 'fonts'));
console.log('Exists?', fs.existsSync(path.join(process.cwd(), 'fonts/Cairo-Regular.ttf')));
