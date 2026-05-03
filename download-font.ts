import https from 'https';
import fs from 'fs';
import path from 'path';

function download(url: string, dest: string) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location!, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error('Failed to get ' + url + ' (' + response.statusCode + ')'));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

download('https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo-Regular.ttf', path.join(process.cwd(), 'fonts/Cairo-New.ttf'))
  .then(() => console.log('Downloaded Cairo-New.ttf'))
  .catch(console.error);

