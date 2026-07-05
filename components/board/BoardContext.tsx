"use client";

import { createContext, useContext } from "react";
import type { Group, Task, Contributor, TaskAttachment } from "@/types";

export interface BoardContextValue {
  // Data
  groups: Group[];
  tasksByGroup: Record<string, Task[]>;
  contributors: Contributor[];
  selectedProjectId: string;
  collapsedGroups: Set<string>;
  canEdit: boolean;

  // Project actions
  updateProject: (id: string, name: string) => Promise<void>;

  // Group actions
  toggleGroupCollapse: (groupId: string) => void;
  addGroup: (name: string) => Promise<void>;
  updateGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (activeId: string, overId: string) => Promise<void>;

  // Task actions
  addTask: (groupId: string) => Promise<void>;
  updateTask: (
    id: string,
    groupId: string,
    updates: Partial<Task>,
    prevTask?: Task
  ) => Promise<void>;
  deleteTask: (id: string, groupId: string) => Promise<void>;
  reorderTasks: (
    groupId: string,
    activeId: string,
    overId: string
  ) => Promise<void>;

  // Attachment actions
  uploadAttachment: (
    taskId: string,
    groupId: string,
    file: File
  ) => Promise<void>;
  deleteAttachment: (
    attachment: TaskAttachment,
    taskId: string,
    groupId: string
  ) => Promise<void>;
  getSignedUrl: (filePath: string) => Promise<string>;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardContext must be used inside BoardContext.Provider");
  return ctx;
}
