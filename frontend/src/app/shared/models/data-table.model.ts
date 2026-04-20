import { PageEvent } from '@angular/material/paginator';

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'numeric' | 'currency' | 'date' | 'status' | 'action' | 'custom';
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  actions?: { 
    icon: string; 
    label: string; 
    actionKey: string; 
    color?: string; 
    tooltip?: string; 
    showIf?: (row: any) => boolean 
  }[];
  colorMap?: Record<string, string>;
  classMap?: Record<string, string>;
  pipeFormat?: string;
  getValue?: (row: any) => any;
  getCellClass?: (row: any) => string;
}

export interface TableActionClickEvent {
  action: string;
  row: any;
}

export interface TableAction {
  icon: string;
  label: string;
  actionKey: string;
  color?: string;
  tooltip?: string;
  showIf?: (row: any) => boolean;
}
