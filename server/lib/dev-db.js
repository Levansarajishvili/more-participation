/**
 * development: `MONGODB_URI` არ არის → დროებითი in-memory replica set (`mongodb-memory-server-core`,
 * devDependency — წარმოების install-ში არ არის; production-ში კონფიგი `MONGODB_URI`-ს ითხოვს).
 * მონაცემი გადატვირთვისას იკარგება. Atlas-ის ვერსიასთან თანხვედრა — MongoDB 8.0.
 * binary — `fastdl.mongodb.org`, ქეში — `~/.cache/mongodb-binaries`.
 */

/** Atlas Free / Flex — MongoDB 8.0; პატჩი ≥ 14 დღის (B0-ის წესი). `MONGOMS_VERSION` ცვლის. */
export const MONGO_BINARY_VERSION = process.env.MONGOMS_VERSION || '8.0.34';

/**
 * @returns {Promise<{ uri: string, stop: () => Promise<void> }>}
 */
export async function startMemoryReplicaSet() {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server-core');
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    binary: { version: MONGO_BINARY_VERSION },
  });
  return {
    uri: replSet.getUri(),
    stop: async () => {
      await replSet.stop();
    },
  };
}
