import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
import path from 'path';

pdfmake.fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'fonts/Amiri-Regular.ttf'),
    bold: path.join(process.cwd(), 'fonts/Amiri-Regular.ttf'),
    italics: path.join(process.cwd(), 'fonts/Amiri-Regular.ttf'),
    bolditalics: path.join(process.cwd(), 'fonts/Amiri-Regular.ttf')
  }
};
const docDef = { content: 'test text مرحبًا' };
const pdf = pdfmake.createPdf(docDef);
pdf.getBuffer().then(b => {
  console.log("buffer size Amiri", b.length);
}).catch(e => {
  console.error("error!!", e.message);
});
