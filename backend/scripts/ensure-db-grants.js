/**
 * Ensures the DB user has CONNECT and full privileges on the target database and public schema.
 * Run at container startup (before prisma migrate) when RDS returns
 * "User was denied access on the database".
 * Connects to the default "postgres" database to run GRANTs, then to the target DB for schema grants.
 */
const { Client } = require('pg');

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl || !rawUrl.startsWith('postgresql')) {
  console.log('ensure-db-grants: DATABASE_URL not set or not postgresql, skipping.');
  process.exit(0);
}

// Parse postgresql://user:password@host:port/database (password may contain : or @)
const afterProtocol = rawUrl.replace(/^postgresql:\/\//i, '');
const atIdx = afterProtocol.lastIndexOf('@');
if (atIdx === -1) {
  console.warn('ensure-db-grants: could not parse DATABASE_URL, skipping.');
  process.exit(0);
}
const authPart = afterProtocol.slice(0, atIdx);
const hostDbPart = afterProtocol.slice(atIdx + 1);
const colonIdx = authPart.indexOf(':');
const user = colonIdx === -1 ? authPart : authPart.slice(0, colonIdx);
const password = colonIdx === -1 ? '' : authPart.slice(colonIdx + 1);
const slashIdx = hostDbPart.indexOf('/');
const hostPort = slashIdx === -1 ? hostDbPart : hostDbPart.slice(0, slashIdx);
const database = slashIdx === -1 ? 'postgres' : hostDbPart.slice(slashIdx + 1).split('?')[0];
const [host, portPart] = hostPort.split(':');
const port = portPart ? parseInt(portPart, 10) : 5432;
if (!user || !database) {
  console.warn('ensure-db-grants: could not parse DATABASE_URL, skipping.');
  process.exit(0);
}
// RDS requires SSL. Use ssl so connection is not rejected (no pg_hba.conf entry for "no encryption").
const isRds = host.includes('.rds.') || host.includes('amazonaws.com');
const sslOpt = isRds ? { rejectUnauthorized: false } : false;
const config = { user, password, host, port, ssl: sslOpt };
const safeDb = database.replace(/"/g, '""');
const safeUser = user.replace(/"/g, '""');

async function run() {
  // Step 1: Optional — connect to "postgres" and grant CONNECT/ALL on target DB. On RDS this often fails (app may not connect to postgres); then we rely on step 2.
  const clientToPostgres = new Client({ ...config, database: 'postgres' });
  try {
    await clientToPostgres.connect();
    await clientToPostgres.query(`GRANT CONNECT ON DATABASE "${safeDb}" TO "${safeUser}"`);
    await clientToPostgres.query(`GRANT ALL PRIVILEGES ON DATABASE "${safeDb}" TO "${safeUser}"`);
    console.log('ensure-db-grants: database grants applied for', user, 'on', database);
  } catch (e) {
    console.warn('ensure-db-grants: postgres DB step skipped (non-fatal):', e.message);
  } finally {
    try {
      await clientToPostgres.end();
    } catch (_) {}
  }

  // Step 2: Connect to target database and grant schema/table/sequence — required for RDS "denied access".
  const clientToDb = new Client({ ...config, database });
  try {
    await clientToDb.connect();
  } catch (e) {
    console.warn('ensure-db-grants: could not connect to target database:', e.message);
    process.exit(0);
  }
  try {
    await clientToDb.query(`GRANT ALL ON SCHEMA public TO "${safeUser}"`);
    await clientToDb.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO "${safeUser}"`);
    await clientToDb.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${safeUser}"`);
    await clientToDb.query(`GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO "${safeUser}"`);
    await clientToDb.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${safeUser}"`);
    await clientToDb.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${safeUser}"`);
    console.log('ensure-db-grants: schema grants applied for', user);
  } catch (e) {
    console.warn('ensure-db-grants: schema grants (non-fatal):', e.message);
  } finally {
    await clientToDb.end();
  }
}

run().catch((e) => {
  console.warn('ensure-db-grants:', e.message);
  process.exit(0);
});
