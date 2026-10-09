export type StatusCategoryKey = 'new' | 'indeterminate' | 'done' | 'undefined';

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraStatusCategory {
  key: StatusCategoryKey;
  name: string;
  colorName: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraIssueFields {
  summary: string;
  description?: string;
  status: JiraStatus;
  assignee?: JiraUser;
  reporter?: JiraUser;
  priority?: JiraPriority;
  issuetype?: JiraIssueType;
  created?: string;
  updated?: string;
  duedate?: string;
  labels?: string[];
  project?: { id: string; key: string; name: string };
}

export interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  fields: JiraIssueFields;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  avatarUrls?: Record<string, string>;
  lead?: JiraUser;
  projectTypeKey?: string;
  insight?: { totalIssueCount: number; lastIssueUpdateTime: string };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
  location?: { projectId: number; projectKey: string; displayName: string };
}

export interface SearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface ProjectSearchResult {
  startAt: number;
  maxResults: number;
  total: number;
  values: JiraProject[];
}

export interface PendingItem {
  icon: string;
  title: string;
  meta: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface ActivityUpdate {
  icon: string;
  iconColor: string;
  title: string;
  meta: string;
  time: string;
}

export interface Milestone {
  label: string;
  date: string;
  state: 'done' | 'current' | 'pending';
}
