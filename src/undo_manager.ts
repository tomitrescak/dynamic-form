import { UndoManager } from 'mst-middlewares';

export let undoManager = {
  manager: null as typeof UndoManager.Type,
  undo: () => {
    undoManager.manager.canUndo && undoManager.manager.undo();
  },
  redo: () => {
    undoManager.manager.canRedo && undoManager.manager.redo();
  }
};
export const setUndoManager = (targetStore: any) => {
  undoManager.manager = targetStore.history;
  return {};
};
