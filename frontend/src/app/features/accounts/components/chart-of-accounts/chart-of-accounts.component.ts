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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadChartOfAccounts();
  }

  loadChartOfAccounts(): void {
    this.loading = true;

    // Mock data for demonstration - in real implementation, this would come from service
    const mockData: AccountHeadNode[] = [
      {
        _id: '1',
        name: 'Assets',
        code: '1000',
        level: 1,
        children: [
          {
            _id: '1.1',
            name: 'Current Assets',
            code: '1100',
            level: 2,
            parentId: '1',
            children: [
              {
                _id: '1.1.1',
                name: 'Cash & Bank',
                code: '1110',
                level: 3,
                parentId: '1.1',
                accountCount: 5,
                totalBalance: 250000
              },
              {
                _id: '1.1.2',
                name: 'Accounts Receivable',
                code: '1120',
                level: 3,
                parentId: '1.1',
                accountCount: 25,
                totalBalance: 180000
              }
            ]
          },
          {
            _id: '1.2',
            name: 'Fixed Assets',
            code: '1200',
            level: 2,
            parentId: '1',
            children: [
              {
                _id: '1.2.1',
                name: 'Property & Equipment',
                code: '1210',
                level: 3,
                parentId: '1.2',
                accountCount: 3,
                totalBalance: 450000
              }
            ]
          }
        ]
      },
      {
        _id: '2',
        name: 'Liabilities',
        code: '2000',
        level: 1,
        children: [
          {
            _id: '2.1',
            name: 'Current Liabilities',
            code: '2100',
            level: 2,
            parentId: '2',
            children: [
              {
                _id: '2.1.1',
                name: 'Accounts Payable',
                code: '2110',
                level: 3,
                parentId: '2.1',
                accountCount: 15,
                totalBalance: -120000
              }
            ]
          }
        ]
      },
      {
        _id: '3',
        name: 'Equity',
        code: '3000',
        level: 1,
        children: [
          {
            _id: '3.1',
            name: 'Owner\'s Equity',
            code: '3100',
            level: 2,
            parentId: '3',
            accountCount: 2,
            totalBalance: 680000
          }
        ]
      },
      {
        _id: '4',
        name: 'Income',
        code: '4000',
        level: 1,
        children: [
          {
            _id: '4.1',
            name: 'Revenue',
            code: '4100',
            level: 2,
            parentId: '4',
            accountCount: 8,
            totalBalance: 850000
          }
        ]
      },
      {
        _id: '5',
        name: 'Expenses',
        code: '5000',
        level: 1,
        children: [
          {
            _id: '5.1',
            name: 'Operating Expenses',
            code: '5100',
            level: 2,
            parentId: '5',
            children: [
              {
                _id: '5.1.1',
                name: 'Cost of Goods Sold',
                code: '5110',
                level: 3,
                parentId: '5.1',
                accountCount: 6,
                totalBalance: -320000
              }
            ]
          }
        ]
      }
    ];

    this.dataSource.data = mockData;
    this.loading = false;
  }

  hasChild = (_: number, node: AccountHeadNode) => !!node.children && node.children.length > 0;

  onCreateAccountHead(): void {
    // Implementation for creating new account head
    this.snackBar.open('Create Account Head functionality coming soon', 'Close', { duration: 3000 });
  }

  onEditAccountHead(node: AccountHeadNode): void {
    // Implementation for editing account head
    this.snackBar.open(`Edit ${node.name} functionality coming soon`, 'Close', { duration: 3000 });
  }

  onDeleteAccountHead(node: AccountHeadNode): void {
    if (confirm(`Are you sure you want to delete "${node.name}" and all its sub-accounts?`)) {
      // Implementation for deleting account head
      this.snackBar.open(`Delete ${node.name} functionality coming soon`, 'Close', { duration: 3000 });
    }
  }

  onViewAccounts(node: AccountHeadNode): void {
    // Navigate to accounts list filtered by this account head
    this.router.navigate(['/accounts'], {
      queryParams: { accountHeadId: node._id }
    });
  }

  onAddSubAccount(node: AccountHeadNode): void {
    // Implementation for adding sub-account
    this.snackBar.open(`Add sub-account to ${node.name} functionality coming soon`, 'Close', { duration: 3000 });
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
    // Implementation for searching account heads
    if (this.searchQuery.trim()) {
      this.snackBar.open(`Search for "${this.searchQuery}" functionality coming soon`, 'Close', { duration: 3000 });
    }
  }
}
