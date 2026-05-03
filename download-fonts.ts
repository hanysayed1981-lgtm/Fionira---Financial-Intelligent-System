import fs from 'fs';
import https from 'https';
import path from 'path';

const downloadFont = (url: string, dest: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location!, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(true);
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function main() {
  if (!fs.existsSync('fonts')) {
    fs.mkdirSync('fonts');
  }
  console.log('Downloading Cairo font...');
  await downloadFont('https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf', 'fonts/Cairo-Regular.ttf');
  console.log('Done.');
}

main();
