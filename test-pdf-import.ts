import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfmake = require('pdfmake');
console.log(pdfmake);
