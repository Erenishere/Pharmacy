import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

export interface DrillDownData {
  title: string;
  data: { label: string; value: string }[];
}

@Component({
  selector: 'app-drill-down-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './drill-down-dialog.component.html',
  styleUrls: ['./drill-down-dialog.component.scss']
})
export class DrillDownDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DrillDownDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DrillDownData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}