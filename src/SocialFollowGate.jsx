import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Instagram, LockKeyhole, X, Youtube } from "lucide-react";

const STORAGE_KEY = "sk_social_follow_gate_v1";
const SocialFollowGateContext = createContext({ requestAccess: (cb) => cb?.() });

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { instagram: !!parsed.instagram, youtube: !!parsed.youtube };
  } catch {
    return { instagram: false, youtube: false };
  }
}

function readGateRequired() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return !!(raw && JSON.parse(raw).gateRequired);
  } catch {
    return false;
  }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function useSocialFollowGate() {
  return useContext(SocialFollowGateContext);
}

export default function SocialFollowGate({ children, instagramUrl, youtubeUrl, triggerEvery = 3 }) {
  const [status, setStatus] = useState(readState);
  const [clickCount, setClickCount] = useState(0);
  const [gateRequired, setGateRequired] = useState(readGateRequired);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const unlocked = status.instagram && status.youtube;

  useEffect(() => {
    saveState({ ...status, gateRequired });
  }, [status, gateRequired]);

  const requestAccess = useCallback((onAllowed) => {
    if (unlocked) {
      onAllowed?.();
      return;
    }

    if (gateRequired) {
      setOpen(true);
      setPending(() => onAllowed || null);
      return;
    }

    const next = clickCount + 1;
    if (next >= triggerEvery) {
      setGateRequired(true);
      setOpen(true);
      setPending(() => onAllowed || null);
      setClickCount(0);
      return;
    }
    setClickCount(next);
    onAllowed?.();
  }, [unlocked, gateRequired, triggerEvery, clickCount]);

  const mark = (key) => {
    setStatus(prev => ({ ...prev, [key]: true }));
  };

  const close = () => {
    setOpen(false);
    setPending(null);
  };

  const continueToJob = () => {
    if (!status.instagram || !status.youtube) return;
    const fn = pending;
    setGateRequired(false);
    setClickCount(0);
    close();
    fn?.();
  };

  const value = useMemo(() => ({ requestAccess, unlocked }), [requestAccess, unlocked]);

  return (
    <SocialFollowGateContext.Provider value={value}>
      {children}
      {open && (
        <div className="sk-follow-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="sk-follow-gate-title">
          <div className="sk-follow-gate-modal">
            <button className="sk-follow-gate-close" onClick={close} aria-label="Close"><X size={20}/></button>
            <div className="sk-follow-gate-lock"><LockKeyhole size={23}/></div>
            <span className="sk-follow-gate-eyebrow">ONE SMALL STEP</span>
            <h2 id="sk-follow-gate-title">Follow & Subscribe to Continue</h2>
            <p className="sk-follow-gate-intro">
              Instagram par <b>Follow</b> aur YouTube par <b>Subscribe</b> karne ke baad hi job details open kar sakte ho.
            </p>

            <div className="sk-follow-gate-socials">
              <div className={`sk-follow-gate-social ${status.instagram ? "done" : ""}`}>
                <div className="sk-follow-gate-social-icon instagram"><Instagram size={22}/></div>
                <div className="sk-follow-gate-social-copy"><b>Instagram</b><span>{status.instagram ? "Follow confirmed" : "Follow SK DIGITAL SERVICE"}</span></div>
                {status.instagram ? <CheckCircle2 className="sk-follow-gate-check" size={22}/> : <a href={instagramUrl} target="_blank" rel="noreferrer" onClick={() => mark("instagram")} className="sk-follow-gate-action">Follow <ExternalLink size={14}/></a>}
              </div>

              <div className={`sk-follow-gate-social ${status.youtube ? "done" : ""}`}>
                <div className="sk-follow-gate-social-icon youtube"><Youtube size={22}/></div>
                <div className="sk-follow-gate-social-copy"><b>YouTube</b><span>{status.youtube ? "Subscribe confirmed" : "Subscribe to SK DIGITAL SERVICE"}</span></div>
                {status.youtube ? <CheckCircle2 className="sk-follow-gate-check" size={22}/> : <a href={youtubeUrl} target="_blank" rel="noreferrer" onClick={() => mark("youtube")} className="sk-follow-gate-action">Subscribe <ExternalLink size={14}/></a>}
              </div>
            </div>

            <div className="sk-follow-gate-note">
              <b>Important:</b> Dono platforms par Follow + Subscribe karoge, tabhi job card continue hoga. Agar abhi complete nahi kiya, next job-card click par popup dobara aa sakta hai.
            </div>

            <label className="sk-follow-gate-confirm">
              <input type="checkbox" checked={status.instagram && status.youtube} onChange={() => {}} readOnly />
              <span>Maine Instagram Follow aur YouTube Subscribe complete kar diya hai.</span>
            </label>

            <button className="sk-follow-gate-continue" disabled={!status.instagram || !status.youtube} onClick={continueToJob}>
              Continue to Job <CheckCircle2 size={18}/>
            </button>
            <small className="sk-follow-gate-disclaimer">Note: website browser se actual Follow/Subscribe status verify nahi kar sakti; buttons user confirmation par based hain.</small>
          </div>
        </div>
      )}
      <style>{`
        .sk-follow-gate-backdrop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:rgba(3,18,45,.68);backdrop-filter:blur(12px)}
        .sk-follow-gate-modal{position:relative;width:min(520px,100%);padding:30px;border:1px solid rgba(255,255,255,.8);border-radius:28px;background:linear-gradient(145deg,#fff,#f5f9ff);box-shadow:0 30px 90px rgba(0,35,90,.35);font-family:inherit;color:#082b61}
        .sk-follow-gate-close{position:absolute;right:16px;top:16px;width:38px;height:38px;border:1px solid #d9e5f5;border-radius:50%;background:#fff;color:#31537e;display:grid;place-items:center;cursor:pointer}
        .sk-follow-gate-lock{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#075bc8,#0b86ff);color:#fff;box-shadow:0 10px 24px rgba(8,99,211,.25);margin-bottom:15px}
        .sk-follow-gate-eyebrow{font-size:11px;font-weight:900;letter-spacing:.14em;color:#0b6fe4}
        .sk-follow-gate-modal h2{margin:6px 35px 8px 0;font-size:27px;line-height:1.12;color:#052b64}
        .sk-follow-gate-intro{margin:0 0 20px;color:#58708f;font-size:14px;line-height:1.55}
        .sk-follow-gate-socials{display:grid;gap:11px}
        .sk-follow-gate-social{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #d9e7f8;border-radius:17px;background:#fff}
        .sk-follow-gate-social.done{border-color:#b8e4d0;background:#f5fffa}
        .sk-follow-gate-social-icon{width:43px;height:43px;border-radius:13px;display:grid;place-items:center;color:#fff;flex:0 0 auto}
        .sk-follow-gate-social-icon.instagram{background:linear-gradient(135deg,#7b2cff,#fa3b72,#ff9c2a)}
        .sk-follow-gate-social-icon.youtube{background:#ff2020}
        .sk-follow-gate-social-copy{display:grid;gap:3px;min-width:0;flex:1}.sk-follow-gate-social-copy b{font-size:15px}.sk-follow-gate-social-copy span{font-size:12px;color:#7186a0}
        .sk-follow-gate-action{display:inline-flex;align-items:center;gap:6px;padding:9px 13px;border-radius:11px;background:#0b67d6;color:#fff;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}
        .sk-follow-gate-check{color:#18a765;flex:0 0 auto}
        .sk-follow-gate-note{margin:17px 0 12px;padding:12px 14px;border-radius:14px;background:#eef6ff;color:#456584;font-size:12px;line-height:1.5}
        .sk-follow-gate-confirm{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:#49647f;line-height:1.45;margin:10px 0 15px}.sk-follow-gate-confirm input{accent-color:#0b6fe4;margin-top:2px}
        .sk-follow-gate-continue{width:100%;border:0;border-radius:14px;padding:13px 16px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#0b67d6,#087ff3);color:#fff;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 10px 24px rgba(8,99,211,.2)}
        .sk-follow-gate-continue:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
        .sk-follow-gate-disclaimer{display:block;margin-top:10px;text-align:center;color:#8a9ab0;font-size:10px;line-height:1.4}
        @media(max-width:560px){.sk-follow-gate-modal{padding:23px;border-radius:23px}.sk-follow-gate-modal h2{font-size:23px}.sk-follow-gate-social-copy span{font-size:11px}.sk-follow-gate-action{padding:8px 10px}}
      `}</style>
    </SocialFollowGateContext.Provider>
  );
}
