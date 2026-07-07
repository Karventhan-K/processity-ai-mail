import './globals.css';

export const metadata = {
  title: 'Processity AI Mail Client',
  description: 'AI-Powered Mail Web Application with Dynamic UI Control',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
