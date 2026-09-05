import 'express-session';
import { RoleName } from '../entities/role.entity';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    roleName?: RoleName;
  }
}
