import bcrypt from 'bcryptjs';
import { type Role } from './constants';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [CredentialsProvider({
    name: 'Acesso jurídico',
    credentials: { numericId: { label: 'ID ou e-mail', type: 'text' }, name: { label: 'Nome', type: 'text' }, password: { label: 'Senha', type: 'password' } },
    async authorize(credentials) {
      if (!credentials?.numericId || !credentials.password) return null;
      const identifier = credentials.numericId.trim();
      const user = await prisma.user.findFirst({ where: { OR: [{ numericId: identifier }, { email: identifier.toLocaleLowerCase() }] } });
      if (!user || (user.role !== 'ADMIN' && user.name.toLocaleLowerCase() !== credentials.name?.trim().toLocaleLowerCase())) return null;
      if (!(await bcrypt.compare(credentials.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, numericId: user.numericId, role: user.role };
    }
  })],
  callbacks: {
    jwt: ({ token, user }) => { if (user) { token.id = user.id; token.numericId = user.numericId; token.role = user.role; } return token; },
    session: ({ session, token }) => { if (session.user && token.id && token.numericId && token.role) session.user = { id: token.id, numericId: token.numericId, name: session.user.name!, role: token.role as Role }; return session; }
  }
};
export const getAuth = () => getServerSession(authOptions);
