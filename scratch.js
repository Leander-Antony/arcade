import { io } from 'socket.io-client';

const url = 'https://arcade-server-kzo5.onrender.com';
console.log('Connecting to', url, '...');
const socket = io(url);

socket.on('connect', () => {
  console.log('Successfully connected! ID:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  if (err.description) console.error(err.description);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 5000);
