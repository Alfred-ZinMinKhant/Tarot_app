import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// expo-sqlite has no native module under Jest; back it with sql.js so the real SQL and migrations run.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: () => jest.requireActual('./src/db/sqljsAdapter').openSqlJsDatabase(),
}));

// expo-notifications needs native code; use an in-memory fake (see test/mocks).
jest.mock('expo-notifications', () => jest.requireActual('./test/mocks/expoNotifications'));

// expo-audio needs native players; record what would have played instead.
jest.mock('expo-audio', () => jest.requireActual('./test/mocks/expoAudio'));
