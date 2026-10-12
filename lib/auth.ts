import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { type Role } from './constants';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';

// Render does not automatically define this variable for services created
// manually. Keep authentication available while the environment is being set
// up; production should still define NEXTAUTH_SECRET explicitly.
const fallbackSecret = createHash('sha256')
  .update(`alta-juridico:${process.env.ADMIN_EMAIL ?? 'admin'}:${process.env.ADMIN_ID ?? '742'}`)
  .digest('hex');

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || fallbackSecret,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [CredentialsProvider({
    name: 'Acesso jurídico',
    credentials: { numericId: { label: 'ID/passaporte', type: 'text' }, name: { label: 'Nome', type: 'text' }, password: { label: 'Senha', type: 'password' } },
    async authorize(credentials) {
      if (!credentials?.numericId || !credentials.password) return null;
      const identifier = credentials.numericId.trim();
      const user = await prisma.user.findUnique({ where: { numericId: identifier } });
      if (!user || !user.active || (user.role !== 'ADMIN' && user.name.toLocaleLowerCase() !== credentials.name?.trim().toLocaleLowerCase())) return null;
      if (!(await bcrypt.compare(credentials.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, numericId: user.numericId, role: user.role as Role, oab:user.oab||undefined };
    }
  })],
  callbacks: {
    jwt: ({ token, user }) => { if (user) { token.id = user.id; token.numericId = user.numericId; token.role = user.role; token.oab=user.oab; } return token; },
    session: ({ session, token }) => { if (session.user && token.id && token.numericId && token.role) session.user = { id: token.id, numericId: token.numericId, name: session.user.name!, role: token.role as Role, oab:token.oab }; return session; }
  }
};
export const getAuth = () => getServerSession(authOptions);
