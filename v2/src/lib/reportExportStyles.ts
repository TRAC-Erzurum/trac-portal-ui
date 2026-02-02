export const REPORT_EXPORT_WIDTH = 960

export function getReportExportStyles(width: number = REPORT_EXPORT_WIDTH): string {
  return `
.report-container, .report-container * { box-sizing: border-box; font-family: 'Rajdhani', system-ui, -apple-system, sans-serif !important; }
.report-container { background: #ffffff !important; color: #000000 !important; min-height: 100vh; padding: 2rem; display: flex; flex-direction: column; width: ${width}px !important; min-width: ${width}px !important; }
.net-title { text-align: center; font-weight: bold; font-size: 1.5rem; margin-bottom: 2rem; color: #000000 !important; background: transparent !important; }
.tables-container { flex: 1; width: 100%; margin-bottom: 2rem; background: transparent !important; }
.no-attendees-warning { text-align: center; margin: 20px 0; font-size: 1.125rem; color: #000000 !important; background: transparent !important; }
.no-attendees-warning strong { color: #dc2626 !important; background: transparent !important; }
.attendees-table { border-collapse: collapse; width: 100%; min-width: 560px; font-size: 0.875rem; color: #000000 !important; background: #ffffff !important; table-layout: auto; }
.attendees-thead-tr { background: #f4f4f5 !important; }
.attendees-thead-tr * { background: #f4f4f5 !important; color: #000000 !important; }
.attendees-th { border: 1px solid #d4d4d8 !important; padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; background: #f4f4f5 !important; color: #000000 !important; white-space: nowrap; }
.attendees-tbody-tr { background: #ffffff !important; }
.attendees-tbody-tr * { background: #ffffff !important; color: #000000 !important; }
.attendees-td { border: 1px solid #d4d4d8 !important; padding: 0.5rem 0.75rem; text-align: left; background: transparent !important; color: #000000 !important; }
.attendees-td-center { text-align: center !important; }
.attendees-td-bold { font-weight: 600 !important; }
.attendees-tfoot { background: #fafafa !important; }
.attendees-tfoot * { background: #fafafa !important; color: #000000 !important; }
.attendees-tfoot .attendees-td { border: 1px solid #d4d4d8 !important; background: #fafafa !important; }
.attendees-tfoot-label { font-weight: 600 !important; text-align: right !important; white-space: nowrap !important; width: 1% !important; }
.attendees-tfoot-value { text-align: left !important; }
`
}
