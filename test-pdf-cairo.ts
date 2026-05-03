import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
import path from 'path';
import ArabicReshaper from 'arabic-reshaper';

pdfmake.fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
    bold: path.join(process.cwd(), 'node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf')
  }
};
const txt = 'تقرير المصروفات';
const reshaped = ArabicReshaper.convertArabic(txt);

const docDef = { 
  content: [
    { text: 'reshaped: ' + reshaped, margin: [0, 10] },
    { text: 'reshaped RTL: ' + reshaped, margin: [0, 10], textDirection: 'rtl' }
  ],
  defaultStyle: { font: 'Roboto' }
};

const pdf = pdfmake.createPdf(docDef);
pdf.getBuffer().then(b => {
  require('fs').writeFileSync('test-out4.pdf', b);
  console.log("Written test-out4.pdf");
}).catch(e => {
  console.error("error!!", e.stack);
});
