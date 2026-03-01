export const REPORT_EXPORT_WIDTH = 960

export function getReportExportStyles(width: number = REPORT_EXPORT_WIDTH): string {
  return `
.report-container, .report-container * { box-sizing: border-box; font-family: 'Rajdhani', system-ui, -apple-system, sans-serif !important; }
.report-container { background: #ffffff !important; color: #000000 !important; min-height: 100vh; padding: 2rem; display: flex; flex-direction: column; width: ${width}px !important; min-width: ${width}px !important; }
.report-header { display: flex; flex-direction: column; align-items: stretch; gap: 0.75rem; margin-bottom: 1.5rem; background: transparent !important; }
.report-top { display: flex; align-items: center; justify-content: center; gap: 0.75rem; background: transparent !important; }
.report-logo { width: 80px; height: auto; max-height: 80px; object-fit: contain; display: block; background: transparent !important; }
.branch-title { margin: 0; font-weight: 700; font-size: 1.5rem; text-align: center; color: #000000 !important; background: transparent !important; }
.net-title { text-align: center; font-weight: 700; font-size: 1.25rem; margin: 0; color: #000000 !important; background: transparent !important; }
.header-meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; align-items: center; font-weight: 600; background: transparent !important; }
.header-meta-item { padding: 0.25rem 0; color: #000000 !important; background: transparent !important; }
.header-meta-left { text-align: left !important; }
.header-meta-center { text-align: center !important; }
.header-meta-right { text-align: right !important; }
.tables-container { flex: 1; width: 100%; margin-bottom: 2rem; background: transparent !important; }
.no-attendees-warning { text-align: center; margin: 20px 0; font-size: 1.125rem; color: #000000 !important; background: transparent !important; }
.no-attendees-warning strong { color: #dc2626 !important; background: transparent !important; }
.attendees-table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 0.875rem; color: #000000 !important; background: #ffffff !important; table-layout: fixed; }
.attendees-col-index { width: 4%; }
.attendees-col-call-sign { width: 12%; }
.attendees-col-operator { width: 25%; }
.attendees-col-qth { width: 25%; }
.attendees-col-signal { width: 6%; }
.attendees-col-join-time { width: 28%; }
.attendees-thead-tr { background: #f4f4f5 !important; }
.attendees-thead-tr * { background: #f4f4f5 !important; color: #000000 !important; }
.attendees-th { border: 1px solid #d4d4d8 !important; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; background: #f4f4f5 !important; color: #000000 !important; white-space: nowrap; vertical-align: middle !important; }
.attendees-tbody-tr { background: #ffffff !important; }
.attendees-tbody-tr * { background: #ffffff !important; color: #000000 !important; }
.attendees-td { border: 1px solid #d4d4d8 !important; padding: 0.5rem 0.75rem; text-align: left; background: transparent !important; color: #000000 !important; vertical-align: middle !important; }
.attendees-td-bold { font-weight: 600 !important; }
.attendees-tfoot { background: #fafafa !important; }
.attendees-tfoot * { background: #fafafa !important; color: #000000 !important; }
.attendees-tfoot .attendees-td { border: 1px solid #d4d4d8 !important; background: #fafafa !important; }
.attendees-tfoot-label { font-weight: 600 !important; text-align: right !important; white-space: nowrap !important; width: 1% !important; }
.attendees-tfoot-value { text-align: left !important; }
`
}
