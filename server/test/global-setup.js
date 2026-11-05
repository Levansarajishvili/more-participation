import { startMemoryReplicaSet } from '../lib/dev-db.js';

/**
 * ერთი in-memory replica set ყველა ტესტ-ფაილისთვის (`inject('mongoUri')`). binary პირველ გაშვებაზე
 * `fastdl.mongodb.org`-იდან იტვირთება (~100 MB), შემდეგ — ქეშიდან.
 * @param {import('vitest/node').TestProject} project
 */
export default async function setup(project) {
  const mongo = await startMemoryReplicaSet();
  project.provide('mongoUri', mongo.uri);
  return async () => {
    await mongo.stop();
  };
}
