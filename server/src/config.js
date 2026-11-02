export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: '7d',
  publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:8080',
};
