export type NavQuickAction =
  | 'update-stage'
  | 'sell-project'
  | 'issue-material'
  | 'purchase-material'
  | 'add-labour'
  | 'record-sale'
  | 'view-profit'
  | 'view-activity';

export type NavIntent = {
  projectId?: string;
  action?: NavQuickAction;
} | null;
