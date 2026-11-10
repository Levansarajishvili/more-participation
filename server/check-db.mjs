import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  console.log('OK — კავშირი დამყარდა');
} catch (error) {
  console.log(error.name);
  for (const [host, server] of error.reason?.servers ?? []) {
    console.log(host, '→', server.error?.message ?? server.type);
  }
} finally {
  await client.close();
}
