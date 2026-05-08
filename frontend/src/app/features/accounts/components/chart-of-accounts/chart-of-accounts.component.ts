import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NestedTreeControl } from '@angular/cdk/tree';
import { Router } from '@angular/router';
import { SupportingMasterService, AccountHead } from '../../../master-data/services/supporting-master.service';

interface AccountHeadNode {
  _id: string;
  name: string;
  code: string;
  level: number;
  parentId?: string;
  children?: AccountHeadNode[];
  accountCount?: number;
  totalBalance?: number;
}

@Component({
  selector: 'app-chart-of-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTreeModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './chart-of-accounts.component.html',
  styleUrls: ['./chart-of-accounts.component.scss']
})
export class ChartOfAccountsComponent implements OnInit {
  treeControl = new NestedTreeControl<AccountHeadNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<AccountHeadNode>();

  loading = false;
  searchQuery = '';

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private supportingMasterService: SupportingMasterService
  ) {}

  ngOnInit(): void {
    this.loadChartOfAccounts();
  }

  loadChartOfAccounts(): void {
    this.loading = true;

    this.supportingMasterService.getAccountHeads({ isActive: true }).subscribe({
      next: (response) => {
        this.dataSource.data = this.buildTree(response.data || []);
        this.treeControl.dataNodes = this.dataSource.data;
        this.treeControl.expandAll();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load chart of accounts', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  hasChild = (_: number, node: AccountHeadNode) => !!node.children && node.children.length > 0;

  onCreateAccountHead(): void {
    this.router.navigate(['/master-data'], { queryParams: { tab: 'account-heads', action: 'create' } });
  }

  onEditAccountHead(node: AccountHeadNode): void {
    this.router.navigate(['/master-data'], { queryParams: { tab: 'account-heads', edit: node._id } });
  }

  onViewAccounts(node: AccountHeadNode): void {
    // Navigate to accounts list filtered by this account head
    this.router.navigate(['/accounts'], {
      queryParams: { accountHeadId: node._id }
    });
  }

  onAddSubAccount(node: AccountHeadNode): void {
    this.router.navigate(['/accounts/registration'], { queryParams: { accountHeadId: node._id } });
  }

  getNodeIcon(node: AccountHeadNode): string {
    if (node.level === 1) return 'account_tree';
    if (node.level === 2) return 'folder';
    return 'account_balance';
  }

  getNodeColor(node: AccountHeadNode): string {
    switch (node.code.charAt(0)) {
      case '1': return '#4CAF50'; // Assets - Green
      case '2': return '#F44336'; // Liabilities - Red
      case '3': return '#FF9800'; // Equity - Orange
      case '4': return '#2196F3'; // Income - Blue
      case '5': return '#9C27B0'; // Expenses - Purple
      default: return '#666';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.loadChartOfAccounts();
      return;
    }

    const filtered = this.filterTree(this.dataSource.data, query);
    this.dataSource.data = filtered;
    this.treeControl.dataNodes = filtered;
    this.treeControl.expandAll();
  }

  private buildTree(accountHeads: AccountHead[]): AccountHeadNode[] {
    const nodes = new Map<string, AccountHeadNode>();
    accountHeads.forEach(head => {
      nodes.set(head._id, {
        _id: head._id,
        name: head.name,
        code: head.code,
        level: 1,
        parentId: head.parentHeadId,
        children: []
      });
    });

    const roots: AccountHeadNode[] = [];
    nodes.forEach(node => {
      if (node.parentId && nodes.has(node.parentId)) {
        const parent = nodes.get(node.parentId)!;
        node.level = parent.level + 1;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return this.sortNodes(roots);
  }

  private sortNodes(nodes: AccountHeadNode[]): AccountHeadNode[] {
    return nodes
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(node => ({
        ...node,
        children: node.children?.length ? this.sortNodes(node.children) : undefined
      }));
  }

  private filterTree(nodes: AccountHeadNode[], query: string): AccountHeadNode[] {
    return nodes.reduce<AccountHeadNode[]>((matches, node) => {
      const children = node.children ? this.filterTree(node.children, query) : [];
      const isMatch = node.name.toLowerCase().includes(query) || node.code.toLowerCase().includes(query);
      if (isMatch || children.length) {
        matches.push({
          ...node,
          children: children.length ? children : undefined
        });
      }
      return matches;
    }, []);
  }
}
