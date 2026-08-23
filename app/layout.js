import './globals.css';
import Sky from '@/components/Sky';

export const metadata = {
  title: 'A little something for you 💗',
  description: 'A tiny page with a tiny question.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Sky />
        {children}
      </body>
    </html>
  );
}
