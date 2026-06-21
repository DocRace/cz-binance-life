import { createContext, useContext, type ReactNode } from "react";
import type { ClubStoryTranslateTarget } from "../../lib/clubStoryTranslate";

export type ClubStoryTranslationsById = Record<
  string,
  Partial<Record<ClubStoryTranslateTarget, string>>
>;

export const ClubStoryTranslationsContext = createContext<{
  ready: boolean;
  byId: ClubStoryTranslationsById;
}>({ ready: true, byId: {} });

export function ClubStoryTranslationsProvider({
  byId,
  ready,
  children,
}: {
  byId: ClubStoryTranslationsById;
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <ClubStoryTranslationsContext.Provider value={{ byId, ready }}>
      {children}
    </ClubStoryTranslationsContext.Provider>
  );
}

export function useClubStoryTranslations() {
  return useContext(ClubStoryTranslationsContext);
}
