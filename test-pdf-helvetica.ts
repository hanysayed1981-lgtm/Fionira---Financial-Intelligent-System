import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
import path from 'path';

pdfmake.fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};
const docDef = { content: 'test text' };
const pdf = pdfmake.createPdf(docDef);
pdf.getBuffer().then(b => {
  console.log("buffer size Helvetica", b.length);
}).catch(e => {
  console.error("error Helvetica!!", e.message);
});
