import { Component, OnInit, AfterViewInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

import { JiraService } from '../core/services/jira';
import { JiraIssue, JiraSprint, PendingItem, ActivityUpdate, Milestone } from '../core/models/jira.models';

export type FilterKey = 'all' | 'done' | 'indeterminate' | 'undefined' | 'new';

export interface KpiCard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  filterKey: FilterKey;
  subtitle: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatCardModule, MatChipsModule, MatIconModule,
    MatProgressBarModule, MatListModule, MatDividerModule,
    MatTooltipModule, MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit {
  private jira = inject(JiraService);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  sprint       = signal<JiraSprint | null>(null);
  pending      = signal<PendingItem[]>([]);
  updates      = signal<ActivityUpdate[]>([]);
  milestones   = signal<Milestone[]>([]);
  kpis         = signal<KpiCard[]>([]);
  activeFilter = signal<FilterKey>('all');
  allIssues    = signal<JiraIssue[]>([]);

  dataSource = new MatTableDataSource<JiraIssue>([]);
  displayedColumns = ['key', 'summary', 'status', 'priority', 'assignee', 'duedate'];
  readonly filters: FilterKey[] = ['all', 'done', 'indeterminate', 'new'];

  // Progreso dinámico: % de issues completadas
  readonly projectProgress = computed(() => {
    const issues = this.allIssues();
    if (!issues.length) return 0;
    const done = issues.filter(i => i.fields?.status?.statusCategory?.key === 'done').length;
    return Math.round((done / issues.length) * 100);
  });

  ngOnInit(): void {
    // Sprint primero (sincrónico en mock) para que buildKpis lo use
    this.jira.getActiveSprint().subscribe(s => this.sprint.set(s));
    this.jira.getPendingItems().subscribe(p => this.pending.set(p));
    this.jira.getActivityUpdates().subscribe(u => this.updates.set(u));
    this.jira.getMilestones().subscribe(m => this.milestones.set(m));

    this.jira.searchIssues(`project = ${this.jira.projectKey} ORDER BY updated DESC`).subscribe({
      next: res => {
        const issues = res?.issues ?? [];
        this.allIssues.set(issues);
        this.dataSource.data = issues;
        this.buildKpis(issues);
      },
      error: () => {
        // Fallback extremo: si todo falla, mostrar mock completo
        this.jira.searchIssues('').subscribe(res => {
          const issues = res?.issues ?? [];
          this.allIssues.set(issues);
          this.dataSource.data = issues;
          this.buildKpis(issues);
        });
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(key: FilterKey): void {
    this.activeFilter.set(key);
    const all = this.allIssues();
    this.dataSource.data = key === 'all'
      ? all
      : all.filter(i => i.fields?.status?.statusCategory?.key === key);
    if (this.paginator) this.paginator.firstPage();
  }

  private buildKpis(issues: JiraIssue[]): void {
    const done    = issues.filter(i => i.fields?.status?.statusCategory?.key === 'done').length;
    const prog    = issues.filter(i => i.fields?.status?.statusCategory?.key === 'indeterminate').length;
    const todo    = issues.filter(i => i.fields?.status?.statusCategory?.key === 'new').length;
    const pct     = issues.length ? Math.round((done / issues.length) * 100) : 0;
    const spName  = this.sprint()?.name ?? 'Sprint activo';

    this.kpis.set([
      { label:'Total tareas', value:issues.length, icon:'assignment',             colorClass:'kpi-blue',   filterKey:'all',           subtitle:spName },
      { label:'Finalizadas',  value:done,           icon:'check_circle',           colorClass:'kpi-green',  filterKey:'done',          subtitle:`${pct}% completado` },
      { label:'En curso',     value:prog,           icon:'pending',                colorClass:'kpi-yellow', filterKey:'indeterminate',  subtitle:'Tareas activas' },
      { label:'Por hacer',    value:todo,           icon:'radio_button_unchecked', colorClass:'kpi-red',    filterKey:'new',            subtitle:'Pendientes de inicio' },
    ]);
  }

  statusIcon(key: string): string {
    const map: Record<string, string> = { done:'check_circle', indeterminate:'pending', 'undefined':'block', new:'radio_button_unchecked' };
    return map[key] ?? 'help';
  }

  statusClass(key: string): string {
    const map: Record<string, string> = { done:'status-done', indeterminate:'status-progress', 'undefined':'status-blocked', new:'status-todo' };
    return map[key] ?? '';
  }

  priorityIcon(name = ''): string {
    if (name === 'Highest') return 'keyboard_double_arrow_up';
    if (name === 'High')    return 'keyboard_arrow_up';
    if (name === 'Medium')  return 'drag_handle';
    if (name === 'Low')     return 'keyboard_arrow_down';
    return 'keyboard_double_arrow_down';
  }

  priorityClass(name = ''): string {
    if (name === 'Highest' || name === 'High') return 'priority-high';
    if (name === 'Medium') return 'priority-medium';
    return 'priority-low';
  }

  milestoneIcon(state: string): string {
    const map: Record<string, string> = { done:'check_circle', current:'adjust', pending:'radio_button_unchecked' };
    return map[state] ?? 'circle';
  }

  urgencyClass(u: string): string {
    const map: Record<string, string> = { high:'urgency-high', medium:'urgency-medium', low:'urgency-low' };
    return map[u] ?? '';
  }

  filterLabel(key: FilterKey): string {
    const map: Record<string, string> = { all:'Todas', done:'Finalizadas', indeterminate:'En curso', 'undefined':'Bloqueadas', new:'Por hacer' };
    return map[key] ?? key;
  }

  get sprintProgressValue(): number {
    const s = this.sprint();
    if (!s?.startDate || !s.endDate) return 0;
    const start = new Date(s.startDate).getTime();
    const end   = new Date(s.endDate).getTime();
    return Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100));
  }

  initials(name = ''): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
}
