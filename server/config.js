import dotenv from 'dotenv';

// A local .env is authoritative during development. Deployed services use
// their injected environment, which must not be overridden by a bundled file.
dotenv.config({override: process.env.NODE_ENV !== 'production', quiet: true});
