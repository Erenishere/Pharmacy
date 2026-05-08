// @ts-nocheck
'use strict';

const fs = require('fs');
const path = require('path');
const dirs = [
  'bilty/components/bilty-list/bilty-list.component.html',
  'capital/components/capital-list/capital-list.component.html',
  'cash-adjustment/components/cash-adjustment-list/cash-adjustment-list.component.html',
  'cashbook/components/cashbook.component.html',
  'e-orders/components/e-order-list/e-order-list.component.html',
  'letters/components/letter-list/letter-list.component.html',
  'pdc/components/pdc-list/pdc-list.component.html',
  'quotations/components/quotation-list/quotation-list.component.html',
  'recovery-summary/components/recovery-summary/recovery-summary.component.html',
  'route-plan/components/route-plan-list/route-plan-list.component.html'
];
const basePath = path.join(__dirname, 'src', 'app', 'features');

dirs.forEach(d => {
  const file = path.join(basePath, d);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Convert generic empty state blocks to empty-state-premium pattern
    let newContent = content.replace(/<tr[^>]*\*matNoDataRow[^>]*>[\s\S]*?<\/tr>/g, (match) => {
      // Avoid destroying everything if it's already using empty-state-premium
      if (match.includes('empty-state-premium')) return match;
      
      // Determine columns span name, assuming displayedColumns or displayedColumnKeys
      let colspanMatch = match.match(/colspan\]?="([^"']+)"/);
      let colspan = colspanMatch ? colspanMatch[1] : '10';

      return [
        '    <tr class="mat-row empty-state-row" *matNoDataRow>',
        `      <td class="mat-cell" [attr.colspan]="${colspan}">`,
        '        <div class="empty-state-premium">',
        '          <div class="icon-wrapper">',
        '            <mat-icon>inbox</mat-icon>',
        '            <div class="icon-bg-glow"></div>',
        '          </div>',
        '          <h4>No Records Found</h4>',
        '          <p>There is no data to display matching the current criteria.</p>',
        '        </div>',
        '      </td>',
        '    </tr>',
      ].join('\n');
    });

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log('Updated empty state in', d);
    }
  }
});
