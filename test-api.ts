import http from 'http';

http.get('http://localhost:3000/api/erp/files?type=expenses', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data);
  });
}).on('error', err => console.error(err));
