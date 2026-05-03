const ts = require('typescript');
const program = ts.createProgram(['./src/test-domain.ts'], { noEmit: true, strict: true });
const allDiagnostics = ts.getPreEmitDiagnostics(program);
allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    if (diagnostic.file.fileName.includes('test-domain.ts')) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log(`test-domain.ts (${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`);
    }
  } else {
    console.log(`error TS${diagnostic.code}: ` + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
});
