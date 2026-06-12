export function SafetyBoundary({ backendOk }: { backendOk: boolean }) {
  return <section className="panel guard"><h2>Phase 2 Guarded Controls</h2><p>Propose mission/task changes through approval-gated workflows. Direct runtime actions remain locked.</p><ul><li>Backend: {backendOk ? 'connected on 127.0.0.1:5175' : 'offline; static read-only fallback active'}</li><li>Write gate: approval required</li><li>Audit log: append-only</li><li>Forbidden controls: agent runtime, schedule editor, profile editor, secret reveal</li></ul></section>;
}
