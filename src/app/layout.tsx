import './globals.css';
import { Montserrat, Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import { Providers } from './providers'; 

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata = {
  title: 'FARE 1 TAXI - Premium Transfers',
  description: 'Premium Airport Transfers UK',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className={`${montserrat.variable} ${inter.variable} ${playfair.variable} font-sans bg-primary-black`}>
        
        {/* Load Google Maps */}
        <Script 
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDnN4UvcI26jHDKVymDAI7P5f5Pb7StM6w&libraries=places" 
          strategy="beforeInteractive" 
        />
        
        {/* Load Mapbox */}
        <Script 
          src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js" 
          strategy="beforeInteractive" 
        />

        {/* Wrap children with Auth Provider */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}