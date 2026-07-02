export function formatWorkflowMarker(marker, workflow = {}) {
  const label = marker || 'WORKFLOW_FSM';
  const segments = [];
  if (workflow.domain) segments.push(`domain=${workflow.domain}`);
  segments.push(`state=${workflow.state || 'UNKNOWN'}`);
  segments.push(`action=${workflow.action || 'UNKNOWN'}`);
  segments.push(`reason=${workflow.reason || 'unspecified'}`);
  return `[${label}] ${segments.join(' ')}`;
}
