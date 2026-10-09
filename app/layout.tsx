import type { Metadata } from 'next'; import './globals.css'; import { Providers } from '@/components/Providers';
export const metadata:Metadata={title:'Poder Judiciário | Processos',description:'Gestão jurídica de processos'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body className="grid-bg min-h-screen"><Providers>{children}</Providers></body></html>}
