import { SQLiteProvider } from 'expo-sqlite';

import { migrateDatabase } from '@/src/db/database';
import { AppProvider } from '@/src/providers/app-provider';

export function PersistenceProvider({ children }: React.PropsWithChildren) {
  return (
    <SQLiteProvider databaseName="creamytuner.db" onInit={migrateDatabase}>
      <AppProvider>{children}</AppProvider>
    </SQLiteProvider>
  );
}
