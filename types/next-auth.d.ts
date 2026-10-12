import { Role } from '@/lib/constants';
declare module 'next-auth' { interface Session { user: { id: string; numericId: string; name: string; role: Role; oab?:string } } interface User { numericId: string; role: Role; oab?:string } }
declare module 'next-auth/jwt' { interface JWT { id?: string; numericId?: string; role?: Role; oab?:string } }
