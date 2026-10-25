export class AuthError extends Error {
  constructor(message = "Connexion requise") {
    super(message);
  }
}
export class ForbiddenError extends Error {
  constructor(message = "Action non autorisée") {
    super(message);
  }
}
export class RateLimitError extends Error {
  constructor(public readonly retryAfterSec: number, message = "Trop de requêtes, réessayez dans quelques instants") {
    super(message);
  }
}
export class NotFoundError extends Error {
  constructor(message = "Introuvable") {
    super(message);
  }
}
/** Erreur dont le message peut être affiché tel quel à l'utilisateur. */
export class UserFacingError extends Error {}
