import { io } from 'socket.io-client';

console.log('Connecting to https://problems-collectible-emission-sunglasses.trycloudflare.com...');
const socket = io('https://problems-collectible-emission-sunglasses.trycloudflare.com');

socket.on('connect', () => {
  console.log('Successfully connected! ID:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 5000);
