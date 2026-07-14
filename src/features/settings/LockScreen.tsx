import { LockKeyOpen } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useI18n } from "../../i18n";

export function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!pin || value === pin) {
      onUnlock();
      setValue("");
      setError(false);
      return;
    }
    setError(true);
  };
  return (
    <div className="lock-screen" role="dialog" aria-label={t("lock.label")}>
      <form className="lock-screen__panel" onSubmit={submit}>
        <div className="lock-screen__mark"><LockKeyOpen size={24} weight="duotone" /></div>
        <div>
          <h2>{t("lock.title")}</h2>
          <p>{pin ? t("lock.enterPin") : t("lock.continueHint")}</p>
        </div>
        {pin && (
          <input
            className={`field${error ? " is-error" : ""}`}
            autoFocus
            type="password"
            inputMode="numeric"
            aria-label={t("lock.pin")}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
          />
        )}
        {error && <span className="field-error">{t("lock.wrong")}</span>}
        <button className="btn btn-primary" type="submit">{t("lock.continue")}</button>
      </form>
    </div>
  );
}
