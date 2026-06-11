export interface ReportRequest {
  type: string;
  dateFrom?: string;
  dateTo?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export interface ReportResult {
  id: string;
  type: string;
  status: 'pending' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
}
