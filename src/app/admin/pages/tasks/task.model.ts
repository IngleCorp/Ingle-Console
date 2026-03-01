/**
 * Shared task model — use the same key fields across:
 * - Main Tasks (tasks.component)
 * - Client Project Tasks (project-tasks.component)
 * - Own Project Tasks (own-project-tasks.component)
 */

export type TaskCategory = 'general' | 'clientProject' | 'ownProject';

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAssigneeRef {
  uid: string;
  name: string;
  email?: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

export interface Task {
  id?: string;
  title?: string;
  /** Display title; prefer title, fallback to task. */
  task: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  /** Assignee user IDs. */
  assignees?: string[];
  /** Assignee objects (uid, name) for display. */
  assigns?: TaskAssigneeRef[];
  projectId?: string | null;
  projectName?: string | null;
  projecttaged?: string | null;
  category?: TaskCategory;
  source?: string;
  ownProjectId?: string | null;
  ownProjectTaskId?: string | null;
  rootTaskId?: string | null;
  clientId?: string | null;
  startDate?: Date | any;
  dueDate?: Date | any;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  isActive?: boolean;
  createdAt: Date | any;
  createdBy: string;
  createdByName: string;
  updatedAt?: Date | any;
  updatedBy?: string;
  updatedByName?: string;
  progress?: number;
  timeTaken?: number;
  remarks?: string;
  /** Legacy */
  createdby?: string;
  createdbyid?: string;
  req_id_name?: string;
  req_task_id?: number;
  packageName?: string;
  section?: string;
  milestone?: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
}

/** Canonical status list for all task boards. */
export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: '#6b7280' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'done', label: 'Done', color: '#10b981' },
  { value: 'hold', label: 'On Hold', color: '#f59e0b' }
];

/** Canonical priority list for all task boards. */
export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626' }
];

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#dc2626'
};

/** Helper: get display title from task (title || task || legacy). */
export function getTaskTitle(task: Partial<Task> | null): string {
  if (!task) return '';
  return (task.title || task.task || (task as any).req_id_name || 'Untitled Task').trim() || 'Untitled Task';
}

/** Helper: get creator display name. */
export function getTaskCreatedBy(task: Partial<Task> | null): string {
  if (!task) return '';
  return (task as any).createdByName || (task as any).createdby || (task as any).createdBy || 'Unknown';
}

/** Helper: get assignee display list (names). */
export function getTaskAssigneesDisplay(task: Partial<Task> | null): string[] {
  if (!task) return [];
  const assigns = (task.assigns || []) as TaskAssigneeRef[];
  if (assigns.length) return assigns.map(a => a.name || a.uid || 'Unknown');
  return [];
}
