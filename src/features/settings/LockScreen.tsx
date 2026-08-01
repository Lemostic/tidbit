import { LockKeyOpen } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";

export function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
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
    <div className="lock-screen" role="dialog" aria-label="应用已锁定">
      <form className="lock-screen__panel" onSubmit={submit}>
        <div className="lock-screen__mark"><LockKeyOpen size={24} weight="duotone" /></div>
        <div>
          <h2>便签已锁定</h2>
          <p>{pin ? "输入隐私密码继续使用" : "点击继续恢复便签内容"}</p>
        </div>
        {pin && (
          <input
            className={`field${error ? " is-error" : ""}`}
            autoFocus
            type="password"
            inputMode="numeric"
            aria-label="隐私密码"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
          />
        )}
        {error && <span className="field-error">密码不正确</span>}
        <button className="btn btn-primary" type="submit">继续使用</button>
      </form>
    </div>
  );
}
