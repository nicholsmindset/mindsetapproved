/** Shows ?ok= / ?error= messages set by server actions after a redirect. */
export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  return (
    <>
      {o ? (
        <div className="flash ok" role="status">
          {o}
        </div>
      ) : null}
      {e ? (
        <div className="flash error" role="alert">
          {e}
        </div>
      ) : null}
    </>
  );
}
