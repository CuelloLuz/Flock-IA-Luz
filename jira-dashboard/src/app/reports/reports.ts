import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { JiraService } from '../core/services/jira';
import { JiraIssue, JiraSprint } from '../core/models/jira.models';

interface BarItem { label: string; count: number; pct: number; colorClass: string; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatProgressBarModule,
    MatDividerModule, MatTooltipModule,
  ],
  templateUrl: './reports.html',
  styleUrl:    './reports.scss',
})
export class Reports implements OnInit {
  private jira = inject(JiraService);

  issues = signal<JiraIssue[]>([]);
  sprint = signal<JiraSprint | null>(null);

  readonly total    = computed(() => this.issues().length);
  readonly done     = computed(() => this.issues().filter(i => i.fields.status.statusCategory.key === 'done').length);
  readonly inProg   = computed(() => this.issues().filter(i => i.fields.status.statusCategory.key === 'indeterminate').length);
  readonly todo     = computed(() => this.issues().filter(i => i.fields.status.statusCategory.key === 'new').length);
  readonly donePct  = computed(() => this.total() ? Math.round((this.done() / this.total()) * 100) : 0);

  readonly statusBars = computed<BarItem[]>(() => {
    const t = this.total() || 1;
    return [
      { label:'Finalizado',  count:this.done(),   pct:Math.round(this.done()   / t * 100), colorClass:'bar-green' },
      { label:'En curso',    count:this.inProg(),  pct:Math.round(this.inProg() / t * 100), colorClass:'bar-purple' },
      { label:'Por hacer',   count:this.todo(),   pct:Math.round(this.todo()   / t * 100), colorClass:'bar-gray' },
    ];
  });

  readonly priorityBars = computed<BarItem[]>(() => {
    const issues = this.issues();
    const t = issues.length || 1;
    const count = (name: string) => issues.filter(i => i.fields.priority?.name === name).length;
    const highest = count('Highest');
    const high    = count('High');
    const medium  = count('Medium');
    const low     = count('Low') + count('Lowest');
    return [
      { label:'Crítica',  count:highest, pct:Math.round(highest / t * 100), colorClass:'bar-red' },
      { label:'Alta',     count:high,    pct:Math.round(high    / t * 100), colorClass:'bar-orange' },
      { label:'Media',    count:medium,  pct:Math.round(medium  / t * 100), colorClass:'bar-yellow' },
      { label:'Baja',     count:low,     pct:Math.round(low     / t * 100), colorClass:'bar-green' },
    ];
  });

  readonly teamBars = computed<BarItem[]>(() => {
    const issues = this.issues();
    const assigned = issues.filter(i => i.fields.assignee);
    const unassigned = issues.length - assigned.length;
    const counts: Record<string, number> = {};
    for (const i of assigned) {
      const name = i.fields.assignee!.displayName;
      counts[name] = (counts[name] ?? 0) + 1;
    }
    const max = Math.max(...Object.values(counts), unassigned, 1);
    const bars: BarItem[] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: Math.round(count / max * 100), colorClass: 'bar-purple' }));
    if (unassigned > 0) {
      bars.push({ label:'Sin asignar', count:unassigned, pct:Math.round(unassigned / max * 100), colorClass:'bar-gray' });
    }
    return bars;
  });

  readonly typeBars = computed<BarItem[]>(() => {
    const issues = this.issues();
    const t = issues.length || 1;
    const counts: Record<string, number> = {};
    for (const i of issues) {
      const name = i.fields.issuetype?.name ?? 'Tarea';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: Math.round(count / t * 100), colorClass: 'bar-blue' }));
  });

  readonly sprintPct = computed(() => {
    const s = this.sprint();
    if (!s?.startDate || !s.endDate) return 0;
    const start = new Date(s.startDate).getTime();
    const end   = new Date(s.endDate).getTime();
    return Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100));
  });

  ngOnInit(): void {
    this.jira.getActiveSprint().subscribe(s => this.sprint.set(s));
    this.jira.searchIssues(`project = ${this.jira.projectKey} ORDER BY updated DESC`).subscribe({
      next: res => this.issues.set(res?.issues ?? []),
    });
  }
}
