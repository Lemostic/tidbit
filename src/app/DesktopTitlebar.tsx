import type { DesktopProfile } from "../desktop/DesktopProfile";
import { MacToolbar } from "./MacToolbar";
import { WindowsTitlebar, type DesktopTitlebarProps } from "./WindowsTitlebar";

interface Props extends DesktopTitlebarProps {
  profile: DesktopProfile;
}

export function DesktopTitlebar({ profile, ...props }: Props) {
  return profile.windowChrome === "native"
    ? <MacToolbar {...props} />
    : <WindowsTitlebar {...props} />;
}
