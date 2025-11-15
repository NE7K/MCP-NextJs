import './globals.css';
import SidebarWrapper from '@/components/sidebar/SidebarWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <SidebarWrapper />
        <div className="pageWrapper">
          {children}
        </div>
      </body>
    </html>
  );
}


