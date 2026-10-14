import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authenticates when a valid bearer token is present but never rejects.
 * `@Public()` routes skip the global guard, so `request.user` stays empty on them;
 * add this guard to a public handler that also wants to know who is asking.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(_err: unknown, user: T | false): T | null {
    return user || null;
  }
}
