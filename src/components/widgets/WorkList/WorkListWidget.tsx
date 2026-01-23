import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Edit, FolderOpen, Save, SaveAll } from 'lucide-react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import Papa from 'papaparse';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

export const WorkListWidget: React.FC<{ instanceId?: string }> = ({ instanceId }) => {
  const { t, ready } = useTranslation();
  const instanceIdRef = useRef(instanceId ?? `work-list-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedInstanceId = instanceId ?? instanceIdRef.current;
  const [tasks, setTasks] = useLocalStorage<Task[]>('work-list-tasks', []);
  const [newTask, setNewTask] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  const addTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTask.trim() !== '') {
      setTasks([...tasks, { id: Date.now(), text: newTask.trim(), completed: false }]);
      setNewTask('');
    }
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleUpdate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingTaskId !== null) {
      if (editingTaskText.trim() === '') {
        removeTask(editingTaskId);
      } else {
        setTasks(
          tasks.map(task =>
            task.id === editingTaskId ? { ...task, text: editingTaskText.trim() } : task
          )
        );
      }
      setEditingTaskId(null);
      setEditingTaskText('');
    }
  };

  const handleSaveAs = async () => {
    const csv = Papa.unparse(tasks.map(t => ({ id: t.id, text: t.text, completed: t.completed })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const destination = await requestSaveDestination(currentFilename || 'lista_de_trabajo.csv', { sourceWidgetId: 'work-list' });
    if (!destination) return;
    if (destination?.destination === 'file-manager') {
      await saveToFileManager({
        blob,
        filename: destination.filename,
        sourceWidgetId: 'work-list',
        sourceWidgetTitleKey: 'widgets.work_list.title',
        parentId: destination.parentId,
      });
      setCurrentParentId(destination.parentId);
    } else if (destination?.destination === 'download') {
      downloadBlob(blob, destination.filename);
      setCurrentParentId(null);
    }
    window.dispatchEvent(
      new CustomEvent('widget-title-update', {
        detail: { instanceId: resolvedInstanceId, title: destination.filename },
      })
    );
    setCurrentFilename(destination.filename);
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'work-list', isDirty: false },
      })
    );
    const signature = JSON.stringify(tasks);
    setLastSavedSignature(signature);
    window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'work-list' } }));
  };

  const handleSave = async () => {
    let parentId = currentParentId;
    if (!parentId && currentEntryId) {
      const entry = await getEntry(currentEntryId);
      parentId = entry?.parentId ?? null;
    }
    if (currentFilename && parentId) {
      const csv = Papa.unparse(tasks.map(t => ({ id: t.id, text: t.text, completed: t.completed })));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      await saveToFileManager({
        blob,
        filename: currentFilename,
        sourceWidgetId: 'work-list',
        sourceWidgetTitleKey: 'widgets.work_list.title',
        parentId,
      });
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'work-list', isDirty: false },
        })
      );
      const signature = JSON.stringify(tasks);
      setLastSavedSignature(signature);
      window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'work-list' } }));
      return;
    }
    await handleSaveAs();
  };

  const loadCsvFile = useCallback((file: File, filename?: string, parentId?: string | null, entryId?: string | null) => {
    Papa.parse<Task>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const newTasks = results.data.map(row => ({
            id: Number(row.id) || Date.now() + Math.random(),
            text: String(row.text || ''),
            completed: String(row.completed).toLowerCase() === 'true'
          })).filter(task => task.text);

          if (window.confirm(t('widgets.work_list.replace_list_confirm'))) {
            setTasks(newTasks);
            setLastSavedSignature(JSON.stringify(newTasks));
          } else {
            setTasks(prevTasks => {
              const merged = [...prevTasks, ...newTasks];
              setLastSavedSignature(JSON.stringify(merged));
              return merged;
            });
          }
          const title = filename || file.name;
          if (title) {
            window.dispatchEvent(
              new CustomEvent('widget-title-update', {
                detail: { instanceId: resolvedInstanceId, title },
              })
            );
            setCurrentFilename(title);
            setCurrentParentId(parentId ?? null);
            setCurrentEntryId(entryId ?? null);
          }
          window.dispatchEvent(
            new CustomEvent('widget-dirty-state', {
              detail: { instanceId: resolvedInstanceId, widgetId: 'work-list', isDirty: false },
            })
          );
        },
        error: (error) => {
          console.error("Error al parsear el CSV:", error);
          alert(t('widgets.work_list.csv_error'));
        }
    });
  }, [resolvedInstanceId, setTasks, t]);

  const handleOpenFile = async () => {
    const result = await requestOpenFile({ accept: '.csv', sourceWidgetId: 'work-list' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) loadCsvFile(file, undefined, null, null);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    loadCsvFile(file, entry.name, entry.parentId, entry.id);
  };


  useEffect(() => {
    const unsubscribe = subscribeFileOpen('work-list', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
      loadCsvFile(file, entry.name, entry.parentId, entry.id);
    });
    return unsubscribe;
  }, [loadCsvFile]);

  const isDirty = lastSavedSignature !== '' && JSON.stringify(tasks) !== lastSavedSignature;

  useEffect(() => {
    if (!lastSavedSignature) {
      setLastSavedSignature(JSON.stringify(tasks));
      return;
    }
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'work-list', isDirty },
      })
    );
  }, [isDirty, lastSavedSignature, resolvedInstanceId, tasks]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
      if (custom.detail?.instanceId !== resolvedInstanceId) return;
      if (custom.detail?.widgetId && custom.detail.widgetId !== 'work-list') return;
      handleSave();
    };
    window.addEventListener('widget-save-request', handler as EventListener);
    return () => window.removeEventListener('widget-save-request', handler as EventListener);
  }, [handleSave, resolvedInstanceId]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'work-list', isDirty: false },
        })
      );
    };
  }, [resolvedInstanceId]);

  // Debug: verificar qué devuelve t()
  console.log('WorkList translations:', {
    ready,
    placeholder: t('widgets.work_list.add_task_placeholder'),
    title: t('widgets.work_list.title')
  });

  // Si las traducciones no están listas, mostrar un loader simple
  if (!ready) {
    return <div className="flex items-center justify-center h-full">{t('loading')}</div>;
  }

  return (
    <div className="work-list-widget">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="work-list-input"
          placeholder={t('widgets.work_list.add_task_placeholder')}
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={addTask}
        />
        <button 
          onClick={handleOpenFile}
          className="work-list-icon-button"
          title={t('widgets.work_list.load_csv')}
        >
          <FolderOpen size={20} />
        </button>
        <button 
          onClick={handleSave}
          className="work-list-icon-button"
          title={t('actions.save')}
        >
          <span className="save-indicator-icon">
            <Save size={20} />
            {isDirty && <span className="save-indicator-dot" aria-hidden="true" />}
          </span>
        </button>
        <button 
          onClick={handleSaveAs}
          className="work-list-icon-button"
          title={t('actions.save_as')}
        >
          <SaveAll size={20} />
        </button>
      </div>
      
      {/* ¡ESTA ES LA PARTE QUE FALTABA! */}
      <ul className="work-list-items">
        {tasks.map(task => (
          <li
            key={task.id}
            className={`work-list-item ${task.completed ? 'opacity-50' : ''}`}
          >
            <input
              type="checkbox"
              className="work-list-checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
            />
            {editingTaskId === task.id ? (
              <input
                type="text"
                value={editingTaskText}
                onChange={(e) => setEditingTaskText(e.target.value)}
                onKeyPress={handleUpdate}
                onBlur={() => setEditingTaskId(null)}
                className="work-list-edit-input"
                autoFocus
              />
            ) : (
              <span 
                className={`flex-grow cursor-pointer ${task.completed ? 'line-through' : ''}`}
                onDoubleClick={() => startEditing(task)}
              >
                {task.text}
              </span>
            )}
            <button onClick={() => startEditing(task)} className="work-list-action">
              <Edit size={16} />
            </button>
            <button onClick={() => removeTask(task.id)} className="work-list-action delete">
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="work-list-hint">{t('widgets.work_list.double_click_edit')}</p>

    </div>
  );
};

export { widgetConfig } from './widgetConfig';
