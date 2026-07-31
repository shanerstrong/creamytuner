import { AppProvider } from '@/src/providers/app-provider';

export function PersistenceProvider({ children }: React.PropsWithChildren) {
  return <AppProvider>{children}</AppProvider>;
}
