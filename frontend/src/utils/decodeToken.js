export function decodeToken(token) {
  const payload = JSON.parse(atob(token.split('.')[1]))
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  }
}