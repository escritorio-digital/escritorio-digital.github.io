import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Copy, Save, SaveAll, Maximize2, Minimize2 } from 'lucide-react';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';
import { WidgetToolbar } from '../../core/WidgetToolbar';
import './GroupGeneratorWidget.css';

type GroupMode = 'byCount' | 'bySize';

type GroupGeneratorSnapshot = {
  version: 1;
  studentList: string;
  generatedGroups: string[][];
  mode: GroupMode;
  groupValue: number;
};

const isGroupMode = (value: unknown): value is GroupMode => value === 'byCount' || value === 'bySize';

const isStringArrayArray = (value: unknown): value is string[][] => (
  Array.isArray(value)
  && value.every((group) => Array.isArray(group) && group.every((student) => typeof student === 'string'))
);

const parseSnapshot = (text: string): GroupGeneratorSnapshot | null => {
  try {
    const parsed = JSON.parse(text) as Partial<GroupGeneratorSnapshot>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== 1) return null;
    if (typeof parsed.studentList !== 'string') return null;
    if (!isGroupMode(parsed.mode)) return null;
    if (typeof parsed.groupValue !== 'number' || !Number.isFinite(parsed.groupValue)) return null;
    if (!isStringArrayArray(parsed.generatedGroups)) return null;
    return {
      version: 1,
      studentList: parsed.studentList,
      generatedGroups: parsed.generatedGroups,
      mode: parsed.mode,
      groupValue: parsed.groupValue,
    };
  } catch {
    return null;
  }
};

export const GroupGeneratorWidget: FC<{ instanceId?: string }> = ({ instanceId }) => {
  const { t } = useTranslation();
  const instanceIdRef = useRef(instanceId ?? `group-generator-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedInstanceId = instanceId ?? instanceIdRef.current;
  const [studentList, setStudentList] = useState('Ana\nBeatriz\nCarlos\nDaniela\nEsteban\nFernanda\nGael\nHilda\nIván\nJulia');
  const [mode, setMode] = useState<GroupMode>('byCount');
  const [groupValue, setGroupValue] = useState(3);
  const [generatedGroups, setGeneratedGroups] = useState<string[][]>([]);
  const [isLargeView, setIsLargeView] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const overlayHeaderRef = useRef<HTMLDivElement>(null);
  const overlayGroupsRef = useRef<HTMLDivElement>(null);
  const overlaySizingRef = useRef({
    titleSize: 0,
    textSize: 0,
    minCardWidth: 0,
    containerHeight: 0,
  });

  const applySnapshot = useCallback((snapshot: GroupGeneratorSnapshot) => {
    setStudentList(snapshot.studentList);
    setGeneratedGroups(snapshot.generatedGroups);
    setMode(snapshot.mode);
    setGroupValue(Math.max(1, Math.floor(snapshot.groupValue)));
    setLastSavedSnapshot(JSON.stringify(snapshot));
  }, []);

  const loadFromText = useCallback((text: string) => {
    const snapshot = parseSnapshot(text);
    if (snapshot) {
      applySnapshot(snapshot);
      return;
    }
    setStudentList(text);
    setGeneratedGroups([]);
    setLastSavedSnapshot(JSON.stringify({
      version: 1,
      studentList: text,
      generatedGroups: [],
      mode,
      groupValue,
    }));
  }, [applySnapshot, groupValue, mode]);

  const loadFromBlob = useCallback(async (blob: Blob, filename?: string, parentId?: string | null, entryId?: string | null) => {
    const text = await blob.text();
    loadFromText(text);
    const title = filename?.trim();
    if (title) {
      window.dispatchEvent(
        new CustomEvent('widget-title-update', {
          detail: { instanceId: resolvedInstanceId, title },
        })
      );
    }
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty: false },
      })
    );
    if (title) {
      setCurrentFilename(title);
      setCurrentParentId(parentId ?? null);
      setCurrentEntryId(entryId ?? null);
    }
  }, [loadFromText, resolvedInstanceId]);

  useEffect(() => {
    if (!isLargeView) return;
    const overlayContent = overlayContentRef.current;
    const overlayHeader = overlayHeaderRef.current;
    const groupsContainer = overlayGroupsRef.current;
    if (!overlayContent || !overlayHeader || !groupsContainer) return;

    let frameId = 0;
    const updateSizing = () => {
      if (!overlayContent || !overlayHeader || !groupsContainer) return;

      const contentStyles = getComputedStyle(overlayContent);
      const paddingTop = parseFloat(contentStyles.paddingTop) || 0;
      const paddingBottom = parseFloat(contentStyles.paddingBottom) || 0;
      const gap = parseFloat(contentStyles.rowGap || contentStyles.gap) || 0;
      const availableHeight = Math.max(
        120,
        overlayContent.clientHeight - overlayHeader.offsetHeight - paddingTop - paddingBottom - gap
      );

      groupsContainer.style.height = `${availableHeight}px`;

      const containerWidth = groupsContainer.clientWidth;
      const groupCount = Math.max(1, generatedGroups.length);
      const maxColumns = Math.min(groupCount, Math.max(1, Math.floor(containerWidth / 320)));
      const minCardWidth = Math.max(240, Math.floor(containerWidth / maxColumns) - 16);

      const minTextSize = 16;
      const maxTextSize = Math.min(40, Math.max(20, Math.floor(availableHeight / 5)));
      let low = minTextSize;
      let high = maxTextSize;
      let best = minTextSize;

      for (let i = 0; i < 12; i += 1) {
        const mid = Math.floor((low + high) / 2);
        overlayContent.style.setProperty('--group-text-size', `${mid}px`);
        overlayContent.style.setProperty('--group-title-size', `${Math.round(mid * 1.2)}px`);
        overlayContent.style.setProperty('--group-card-min', `${minCardWidth}px`);

        if (groupsContainer.scrollHeight <= groupsContainer.clientHeight) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const nextTitle = Math.round(best * 1.2);
      const last = overlaySizingRef.current;
      if (
        last.textSize !== best ||
        last.titleSize !== nextTitle ||
        last.minCardWidth !== minCardWidth ||
        last.containerHeight !== availableHeight
      ) {
        overlaySizingRef.current = {
          textSize: best,
          titleSize: nextTitle,
          minCardWidth,
          containerHeight: availableHeight,
        };
        overlayContent.style.setProperty('--group-text-size', `${best}px`);
        overlayContent.style.setProperty('--group-title-size', `${nextTitle}px`);
        overlayContent.style.setProperty('--group-card-min', `${minCardWidth}px`);
      }
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateSizing);
    };

    scheduleUpdate();
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(overlayContent);
    resizeObserver.observe(groupsContainer);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [isLargeView, generatedGroups]);

  const handleOpenFile = async () => {
    const result = await requestOpenFile({ accept: '.txt', sourceWidgetId: 'group-generator' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) await loadFromBlob(file, file.name, null, null);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    await loadFromBlob(entry.blob, entry.name, entry.parentId, entry.id);
  };

  useEffect(() => {
    const unsubscribe = subscribeFileOpen('group-generator', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      await loadFromBlob(entry.blob, entry.name, entry.parentId, entry.id);
    });
    return unsubscribe;
  }, [loadFromBlob]);

  const generateGroups = () => {
    // 1. Limpiar y obtener la lista de estudiantes
    const students = studentList.split('\n').map(s => s.trim()).filter(s => s);
    if (students.length === 0 || groupValue <= 0) {
      setGeneratedGroups([]);
      return;
    }

    // 2. Barajar la lista de forma aleatoria
    const shuffled = [...students].sort(() => Math.random() - 0.5);

    // 3. Crear los grupos
    const newGroups: string[][] = [];
    if (mode === 'byCount') {
      const numGroups = Math.max(1, Math.min(groupValue, students.length));
      for (let i = 0; i < numGroups; i++) newGroups.push([]);
      shuffled.forEach((student, index) => {
        newGroups[index % numGroups].push(student);
      });
    } else { // mode === 'bySize'
      const studentsPerGroup = Math.max(1, groupValue);
      for (let i = 0; i < shuffled.length; i += studentsPerGroup) {
        newGroups.push(shuffled.slice(i, i + studentsPerGroup));
      }
    }
    setGeneratedGroups(newGroups);
  };

  const formatGroupsText = () => (
    generatedGroups
      .map((group, index) => {
        const title = t('widgets.group_generator.group_title', { number: index + 1 });
        const lines = group.map((student) => `- ${student}`);
        return [title, ...lines].join('\n');
      })
      .join('\n\n')
  );

  const copyGroups = async () => {
    if (generatedGroups.length === 0) return;
    const text = formatGroupsText();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // ignore copy failures
    }
  };

  const handleSaveAs = async () => {
    if (generatedGroups.length === 0) return;
    const destination = await requestSaveDestination(currentFilename || 'grupos.txt', { sourceWidgetId: 'group-generator' });
    if (!destination) return;
    if (destination?.destination === 'file-manager') {
      const snapshot: GroupGeneratorSnapshot = {
        version: 1,
        studentList,
        generatedGroups,
        mode,
        groupValue,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
      await saveToFileManager({
        blob,
        filename: destination.filename,
        sourceWidgetId: 'group-generator',
        sourceWidgetTitleKey: 'widgets.group_generator.title',
        parentId: destination.parentId,
      });
      setLastSavedSnapshot(JSON.stringify(snapshot));
      window.dispatchEvent(
        new CustomEvent('widget-title-update', {
          detail: { instanceId: resolvedInstanceId, title: destination.filename },
        })
      );
      setCurrentFilename(destination.filename);
      setCurrentParentId(destination.parentId);
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty: false },
        })
      );
      window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator' } }));
      return;
    }
    if (destination?.destination === 'download') {
      const text = formatGroupsText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, destination.filename);
      const snapshot: GroupGeneratorSnapshot = {
        version: 1,
        studentList,
        generatedGroups,
        mode,
        groupValue,
      };
      setLastSavedSnapshot(JSON.stringify(snapshot));
      window.dispatchEvent(
        new CustomEvent('widget-title-update', {
          detail: { instanceId: resolvedInstanceId, title: destination.filename },
        })
      );
      setCurrentFilename(destination.filename);
      setCurrentParentId(null);
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty: false },
        })
      );
      window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator' } }));
    }
  };

  const handleSave = async () => {
    if (generatedGroups.length === 0) return;
    let parentId = currentParentId;
    if (!parentId && currentEntryId) {
      const entry = await getEntry(currentEntryId);
      parentId = entry?.parentId ?? null;
    }
    if (currentFilename && parentId) {
      const snapshot: GroupGeneratorSnapshot = {
        version: 1,
        studentList,
        generatedGroups,
        mode,
        groupValue,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
      await saveToFileManager({
        blob,
        filename: currentFilename,
        sourceWidgetId: 'group-generator',
        sourceWidgetTitleKey: 'widgets.group_generator.title',
        parentId,
      });
      setLastSavedSnapshot(JSON.stringify(snapshot));
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty: false },
        })
      );
      window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator' } }));
      return;
    }
    await handleSaveAs();
  };

  const snapshot = JSON.stringify({
    version: 1,
    studentList,
    generatedGroups,
    mode,
    groupValue,
  });
  const isDirty = lastSavedSnapshot !== '' && snapshot !== lastSavedSnapshot;

  useEffect(() => {
    if (!lastSavedSnapshot) {
      setLastSavedSnapshot(snapshot);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty },
      })
    );
  }, [isDirty, lastSavedSnapshot, resolvedInstanceId, snapshot]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
      if (custom.detail?.instanceId !== resolvedInstanceId) return;
      if (custom.detail?.widgetId && custom.detail.widgetId !== 'group-generator') return;
      handleSave();
    };
    window.addEventListener('widget-save-request', handler as EventListener);
    return () => window.removeEventListener('widget-save-request', handler as EventListener);
  }, [handleSave, resolvedInstanceId]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'group-generator', isDirty: false },
        })
      );
    };
  }, [resolvedInstanceId]);

  return (
    <div className="group-generator-widget">
      <WidgetToolbar>
        <div className="group-generator-toolbar">
          <button
            className="expand-button"
            onClick={handleOpenFile}
            title={t('widgets.group_generator.load_from_file')}
            aria-label={t('widgets.group_generator.load_from_file')}
          >
            <FolderOpen size={16} />
          </button>
          <button
            className="expand-button"
            onClick={handleSave}
            disabled={generatedGroups.length === 0}
            title={t('actions.save')}
            aria-label={t('actions.save')}
          >
            <span className="save-indicator-icon">
              <Save size={16} />
              {isDirty && <span className="save-indicator-dot" aria-hidden="true" />}
            </span>
          </button>
          <button
            className="expand-button"
            onClick={handleSaveAs}
            disabled={generatedGroups.length === 0}
            title={t('actions.save_as')}
            aria-label={t('actions.save_as')}
          >
            <SaveAll size={16} />
          </button>
          <button
            className="expand-button"
            onClick={copyGroups}
            disabled={generatedGroups.length === 0}
            title={t('widgets.group_generator.copy_groups')}
            aria-label={t('widgets.group_generator.copy_groups')}
          >
            <Copy size={16} />
          </button>
          <button
            className="expand-button"
            onClick={() => setIsLargeView((prev) => !prev)}
            disabled={generatedGroups.length === 0}
            title={isLargeView ? t('widgets.group_generator.close_large_view') : t('widgets.group_generator.view_large')}
            aria-label={isLargeView ? t('widgets.group_generator.close_large_view') : t('widgets.group_generator.view_large')}
          >
            {isLargeView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </WidgetToolbar>
      <div className="input-panel">
        <label className="panel-label">{t('widgets.group_generator.student_list_label')}</label>
        <textarea
          value={studentList}
          onChange={(e) => setStudentList(e.target.value)}
          placeholder={t('widgets.group_generator.placeholder')}
        />
      </div>
      <div className="controls-panel">
        <div className="mode-selection">
          <label>
            <input type="radio" name="mode" checked={mode === 'byCount'} onChange={() => setMode('byCount')} />
            {t('widgets.group_generator.number_of_groups')}
          </label>
          <label>
            <input type="radio" name="mode" checked={mode === 'bySize'} onChange={() => setMode('bySize')} />
            {t('widgets.group_generator.students_per_group')}
          </label>
        </div>
        <input
          type="number"
          value={groupValue}
          onChange={(e) => setGroupValue(Math.max(1, parseInt(e.target.value) || 1))}
          className="group-value-input"
          min="1"
        />
        <button onClick={generateGroups} className="generate-button">
          {t('widgets.group_generator.generate_groups')}
        </button>
      </div>
      <div className="output-panel">
        <div className="output-header">
          <label className="panel-label">{t('widgets.group_generator.generated_groups_label')}</label>
        </div>
        <div className="groups-container">
          {generatedGroups.length > 0 ? (
            generatedGroups.map((group, index) => (
              <div key={index} className="group-card">
                <h4 className="group-title">{t('widgets.group_generator.group_title', { number: index + 1 })}</h4>
                <ul>
                  {group.map(student => <li key={student}>{student}</li>)}
                </ul>
              </div>
            ))
          ) : (
            <p className="no-groups-message">{t('widgets.group_generator.no_groups_message')}</p>
          )}
        </div>
      </div>
      {isLargeView && (
        <div className="groups-overlay" onClick={() => setIsLargeView(false)}>
          <div
            className="groups-overlay-content"
            ref={overlayContentRef}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="groups-overlay-header" ref={overlayHeaderRef}>
              <h3>{t('widgets.group_generator.generated_groups_label')}</h3>
              <button className="expand-button" onClick={() => setIsLargeView(false)}>
                <Minimize2 size={16} />
                <span>{t('widgets.group_generator.close_large_view')}</span>
              </button>
            </div>
            <div className="groups-container groups-container-large" ref={overlayGroupsRef}>
              {generatedGroups.length > 0 ? (
                generatedGroups.map((group, index) => (
                  <div key={index} className="group-card group-card-large">
                    <h4 className="group-title">{t('widgets.group_generator.group_title', { number: index + 1 })}</h4>
                    <ul>
                      {group.map(student => <li key={student}>{student}</li>)}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="no-groups-message">{t('widgets.group_generator.no_groups_message')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
