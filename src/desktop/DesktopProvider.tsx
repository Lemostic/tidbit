import { createContext, type PropsWithChildren, useContext } from "react";
import type { DesktopProfile } from "./DesktopProfile";

const DesktopProfileContext = createContext<DesktopProfile | null>(null);

interface DesktopProviderProps extends PropsWithChildren {
  profile: DesktopProfile;
}

export function DesktopProvider({ profile, children }: DesktopProviderProps) {
  return <DesktopProfileContext.Provider value={profile}>{children}</DesktopProfileContext.Provider>;
}

export function useDesktopProfile(): DesktopProfile {
  const profile = useContext(DesktopProfileContext);
  if (!profile) throw new Error("DesktopProvider is missing");
  return profile;
}
