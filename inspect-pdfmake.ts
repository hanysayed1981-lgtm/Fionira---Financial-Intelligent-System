import fs from "fs";
const c = fs.readFileSync("/app/applet/node_modules/pdfmake/js/OutputDocument.js", "utf8");
console.log(c);
