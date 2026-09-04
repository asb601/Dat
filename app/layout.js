import './globals.css';

export const metadata = {
  title: 'Mission: Have a Good Day',
  description: 'One day. One mission. Classified.',
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f1ead9',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
