import { Component, OnInit, AfterViewInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';

import { JiraService } from '../core/services/jira';
import { JiraIssue } from '../core/models/jira.models';

type StatusFilter = 'all' | 'done' | 'indeterminate' | 'new';
type TypeFilter   = 'all' | 'Tarea' | 'Feature' | 'Epic';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule,
    MatTooltipModule, MatSelectModule, MatChipsModule,
  ],
  templateUrl: './tasks.html',
  styleUrl:    './tasks.scss',
})
export class Tasks implements OnInit, AfterViewInit {
  private jira = inject(JiraService);

  @ViewChild(MatSort)      sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  allIssues    = signal<JiraIssue[]>([]);
  searchText   = signal('');
  statusFilter = signal<StatusFilter>('all');
  typeFilter   = signal<TypeFilter>('all');

  dataSource = new MatTableDataSource<JiraIssue>([]);
  displayedColumns = ['key', 'type', 'summary', 'status', 'assignee', 'priority', 'duedate'];

  readonly statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all',           label: 'Todas' },
    { key: 'done',          label: 'Finalizadas' },
    { key: 'indeterminate', label: 'En curso' },
    { key: 'new',           label: 'Por hacer' },
  ];

  readonly typeFilters: { key: TypeFilter; label: string }[] = [
    { key: 'all',     label: 'Todos los tipos' },
    { key: 'Tarea',   label: 'Tarea' },
    { key: 'Feature', label: 'Feature' },
    { key: 'Epic',    label: 'Epic' },
  ];

  readonly totalVisible = computed(() => this.dataSource.filteredData?.length ?? 0);

  ngOnInit(): void {
    this.jira.searchIssues(`project = ${this.jira.projectKey} ORDER BY priority ASC`).subscribe({
      next: res => {
        this.allIssues.set(res?.issues ?? []);
        this.applyFilters();
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  onSearch(val: string): void {
    this.searchText.set(val);
    this.applyFilters();
  }

  setStatus(f: StatusFilter): void {
    this.statusFilter.set(f);
    this.applyFilters();
  }

  setType(f: TypeFilter): void {
    this.typeFilter.set(f);
    this.applyFilters();
  }

  private applyFilters(): void {
    let issues = this.allIssues();
    const txt = this.searchText().toLowerCase();
    if (txt) {
      issues = issues.filter(i =>
        i.key.toLowerCase().includes(txt) ||
        i.fields.summary.toLowerCase().includes(txt) ||
        (i.fields.assignee?.displayName ?? '').toLowerCase().includes(txt)
      );
    }
    const sf = this.statusFilter();
    if (sf !== 'all') {
      issues = issues.filter(i => i.fields.status.statusCategory.key === sf);
    }
    const tf = this.typeFilter();
    if (tf !== 'all') {
      issues = issues.filter(i => i.fields.issuetype?.name === tf);
    }
    this.dataSource.data = issues;
    if (this.paginator) this.paginator.firstPage();
  }

  statusIcon(key: string): string {
    const m: Record<string, string> = { done:'check_circle', indeterminate:'pending', new:'radio_button_unchecked' };
    return m[key] ?? 'help';
  }

  statusClass(key: string): string {
    const m: Record<string, string> = { done:'status-done', indeterminate:'status-progress', new:'status-todo' };
    return m[key] ?? '';
  }

  typeIcon(name = ''): string {
    const m: Record<string, string> = { Feature:'star', Epic:'bolt', Subtask:'subdirectory_arrow_right' };
    return m[name] ?? 'task_alt';
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

  initials(name = ''): string {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }
}
