import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mencegah zoom / pinch gesture pada perangkat mobile tanpa mengganggu scroll dan tap
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

  document.addEventListener(
    'touchmove',
    (e) => {
      // Hanya cegah jika menggunakan lebih dari 1 jari (pinch zoom)
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

createRoot(document.getElementById('root')!).render(<App />);
