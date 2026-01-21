import { useEffect, useRef, useState } from 'react'; // 'useEffect' ha sido eliminado de esta línea
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import Papa from 'papaparse';
import { Users, Badge, UserPlus, FolderOpen, Download, RotateCcw, AlertTriangle } from 'lucide-react';
import './Attendance.css';
import { downloadBlob, saveToFileManager } from '../../../utils/fileSave';
import { getEntry } from '../../../utils/fileManagerDb';
import { subscribeFileOpen } from '../../../utils/fileOpenBus';
import { requestSaveDestination } from '../../../utils/saveDialog';
import { requestOpenFile } from '../../../utils/openDialog';

// --- Tipos de Datos ---
interface BadgeInfo {
  id: number;
  icon: string;
  description: string;
}

interface Student {
  id: number;
  name: string;
  status: 'present' | 'absent' | 'late';
  badges: number[];
  alerts: number[];
}

type AttendanceRecords = Record<string, Student[]>;

// Constantes movidas dentro del componente para usar traducciones

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Componente Principal ---
export const AttendanceWidget: FC<{ instanceId?: string }> = ({ instanceId }) => {
  const { t, ready } = useTranslation();
  const instanceIdRef = useRef(instanceId ?? `attendance-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedInstanceId = instanceId ?? instanceIdRef.current;
  const [records, setRecords] = useLocalStorage<AttendanceRecords>('attendance-records', {});
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'attendance' | 'badges' | 'alerts'>('attendance');
  const [newStudentName, setNewStudentName] = useState('');
  const [lastSavedSignature, setLastSavedSignature] = useState<string>('');
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);

  // Constantes traducidas
  const AVAILABLE_BADGES: BadgeInfo[] = [
    { id: 1, icon: '⭐', description: t('widgets.attendance.badges.excellent_work') },
    { id: 2, icon: '👍', description: t('widgets.attendance.badges.good_participation') },
    { id: 3, icon: '🎯', description: t('widgets.attendance.badges.goal_achieved') },
    { id: 4, icon: '🤝', description: t('widgets.attendance.badges.helps_classmates') },
  ];

  const AVAILABLE_ALERTS: BadgeInfo[] = [
    { id: 1, icon: '💬', description: t('widgets.attendance.alerts.talks_in_class') },
    { id: 2, icon: '😴', description: t('widgets.attendance.alerts.doesnt_work') },
    { id: 3, icon: '😠', description: t('widgets.attendance.alerts.bad_behavior') },
    { id: 4, icon: '✏️', description: t('widgets.attendance.alerts.incomplete_homework') },
  ];

  // Si las traducciones no están listas, mostrar un loader simple
  if (!ready) {
    return <div className="flex items-center justify-center h-full">{t('loading')}</div>;
  }

  const dateKey = formatDate(selectedDate);
  
  const getStudentsForSelectedDate = () => {
      if (records[dateKey]) {
          return records[dateKey];
      }
      const mostRecentDateKey = Object.keys(records).sort().pop();
      if (mostRecentDateKey) {
          return records[mostRecentDateKey].map(({ id, name }) => ({
              id,
              name,
              status: 'absent' as const,
              badges: [],
              alerts: [],
          }));
      }
      return [];
  };
  
  const students = getStudentsForSelectedDate();

  const updateStudentsForDate = (newStudentList: Student[]) => {
    setRecords(prev => ({ ...prev, [dateKey]: newStudentList }));
  };
  
  const addStudent = () => {
    if (newStudentName.trim() === '') return;
    const newStudent: Student = {
      id: Date.now(),
      name: newStudentName.trim(),
      status: 'absent',
      badges: [],
      alerts: [],
    };
    const currentList = getStudentsForSelectedDate();
    updateStudentsForDate([...currentList, newStudent]);
    setNewStudentName('');
  };

  const setStatus = (id: number, status: Student['status']) => {
    const updatedStudents = students.map(s => s.id === id ? { ...s, status } : s);
    updateStudentsForDate(updatedStudents);
  };

  const toggleBadge = (studentId: number, badgeId: number) => {
    const updatedStudents = students.map(s => {
      if (s.id !== studentId) return s;
      const newBadges = s.badges.includes(badgeId) ? s.badges.filter(bId => bId !== badgeId) : [...s.badges, badgeId];
      return { ...s, badges: newBadges };
    });
    updateStudentsForDate(updatedStudents);
  };
  
  const toggleAlert = (studentId: number, alertId: number) => {
    const updatedStudents = students.map(s => {
        if (s.id !== studentId) return s;
        const newAlerts = s.alerts.includes(alertId) ? s.alerts.filter(aId => aId !== alertId) : [...s.alerts, alertId];
        return { ...s, alerts: newAlerts };
    });
    updateStudentsForDate(updatedStudents);
  };
  
  const loadCsvFile = (file: File, filename?: string) => {
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedStudents: Student[] = results.data.map(row => ({
          id: Number(row.id) || Date.now() + Math.random(),
          name: String(row.name || t('widgets.attendance.no_name')),
          status: 'absent',
          badges: [],
          alerts: [],
        }));
        updateStudentsForDate(importedStudents);
        setLastSavedSignature(JSON.stringify({ ...records, [dateKey]: importedStudents }));
        const title = filename || file.name;
        if (title) {
          window.dispatchEvent(
            new CustomEvent('widget-title-update', {
              detail: { instanceId: resolvedInstanceId, title },
            })
          );
          setCurrentFilename(title);
        }
        window.dispatchEvent(
          new CustomEvent('widget-dirty-state', {
            detail: { instanceId: resolvedInstanceId, widgetId: 'attendance', isDirty: false },
          })
        );
      }
    });
  };

  const handleOpenFile = async () => {
    const result = await requestOpenFile({ accept: '.csv' });
    if (!result) return;
    if (result.source === 'local') {
      const [file] = result.files;
      if (file) loadCsvFile(file);
      return;
    }
    const [entryId] = result.entryIds;
    if (!entryId) return;
    const entry = await getEntry(entryId);
    if (!entry?.blob) return;
    const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
    loadCsvFile(file, entry.name);
  };

  useEffect(() => {
    if (!lastSavedSignature) {
      setLastSavedSignature(JSON.stringify(records));
      return;
    }
    const signature = JSON.stringify(records);
    const isDirty = signature !== lastSavedSignature;
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'attendance', isDirty },
      })
    );
  }, [lastSavedSignature, records, resolvedInstanceId]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('widget-dirty-state', {
          detail: { instanceId: resolvedInstanceId, widgetId: 'attendance', isDirty: false },
        })
      );
    };
  }, [resolvedInstanceId]);

  useEffect(() => {
    const unsubscribe = subscribeFileOpen('attendance', async ({ entryId }) => {
      const entry = await getEntry(entryId);
      if (!entry?.blob) return;
      const file = new File([entry.blob], entry.name, { type: entry.mime || entry.blob.type });
      loadCsvFile(file, entry.name);
    });
    return unsubscribe;
  }, []);

  const handleExport = async () => {
    const dataToExport: any[] = [];
    Object.keys(records).sort().forEach(date => {
        records[date].forEach(s => {
            dataToExport.push({
                date: date,
                id: s.id,
                name: s.name,
                status: s.status,
                badges: s.badges.join(';'),
                alerts: s.alerts.join(';'),
            });
        });
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const destination = await requestSaveDestination(currentFilename || 'asistencia_completa.csv');
    if (!destination) return;
    if (destination?.destination === 'file-manager') {
      await saveToFileManager({
        blob,
        filename: destination.filename,
        sourceWidgetId: 'attendance',
        sourceWidgetTitleKey: 'widgets.attendance.title',
        parentId: destination.parentId,
      });
    } else if (destination?.destination === 'download') {
      downloadBlob(blob, destination.filename);
    }
    window.dispatchEvent(
      new CustomEvent('widget-title-update', {
        detail: { instanceId: resolvedInstanceId, title: destination.filename },
      })
    );
    setCurrentFilename(destination.filename);
    window.dispatchEvent(
      new CustomEvent('widget-dirty-state', {
        detail: { instanceId: resolvedInstanceId, widgetId: 'attendance', isDirty: false },
      })
    );
    setLastSavedSignature(JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('widget-save-complete', { detail: { instanceId: resolvedInstanceId, widgetId: 'attendance' } }));
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ instanceId?: string; widgetId?: string }>;
      if (custom.detail?.instanceId !== resolvedInstanceId) return;
      if (custom.detail?.widgetId && custom.detail.widgetId !== 'attendance') return;
      handleExport();
    };
    window.addEventListener('widget-save-request', handler as EventListener);
    return () => window.removeEventListener('widget-save-request', handler as EventListener);
  }, [handleExport, resolvedInstanceId]);

  const resetAll = () => {
    if (window.confirm(t('widgets.attendance.reset_confirm'))) {
        setRecords({});
    }
  };
  
  const renderControls = (student: Student) => {
    switch (activeTab) {
        case 'attendance':
            return (
                <div className="controls attendance-controls">
                    <button onClick={() => setStatus(student.id, 'present')} className={`status-btn present ${student.status === 'present' ? 'active' : ''}`}>{t('widgets.attendance.present')}</button>
                    <button onClick={() => setStatus(student.id, 'absent')} className={`status-btn absent ${student.status === 'absent' ? 'active' : ''}`}>{t('widgets.attendance.absent')}</button>
                    <button onClick={() => setStatus(student.id, 'late')} className={`status-btn late ${student.status === 'late' ? 'active' : ''}`}>{t('widgets.attendance.late')}</button>
                </div>
            );
        case 'badges':
            return (
                <div className="controls badge-controls">
                    {AVAILABLE_BADGES.map(badge => (
                       <button 
                         key={badge.id}
                         title={badge.description}
                         onClick={() => toggleBadge(student.id, badge.id)}
                         className={`badge-btn ${student.badges.includes(badge.id) ? 'active' : ''}`}
                       >
                         {badge.icon}
                       </button>
                    ))}
                </div>
            );
        case 'alerts':
            return (
                <div className="controls alert-controls">
                    {AVAILABLE_ALERTS.map(alert => (
                       <button 
                         key={alert.id}
                         title={alert.description}
                         onClick={() => toggleAlert(student.id, alert.id)}
                         className={`alert-btn ${student.alerts.includes(alert.id) ? 'active' : ''}`}
                       >
                         {alert.icon}
                       </button>
                    ))}
                </div>
            );
    }
  };

  return (
    <div className="attendance-widget">
      <div className="date-controls">
        <label htmlFor="attendance-date">{t('widgets.attendance.date')}</label>
        <input 
            type="date" 
            id="attendance-date"
            value={dateKey}
            onChange={e => {
                const [year, month, day] = e.target.value.split('-').map(Number);
                setSelectedDate(new Date(year, month - 1, day));
            }}
        />
      </div>

      <div className="main-content">
        <div className="tabs">
          <button onClick={() => setActiveTab('attendance')} className={activeTab === 'attendance' ? 'active' : ''}><Users size={16}/> {t('widgets.attendance.attendance_tab')}</button>
          <button onClick={() => setActiveTab('badges')} className={activeTab === 'badges' ? 'active' : ''}><Badge size={16}/> {t('widgets.attendance.badges_tab')}</button>
          <button onClick={() => setActiveTab('alerts')} className={activeTab === 'alerts' ? 'active' : ''}><AlertTriangle size={16}/> {t('widgets.attendance.alerts_tab')}</button>
        </div>

        <div className="content-area">
          {students.length === 0 ? (
            <div className="empty-state">
              <p>{t('widgets.attendance.no_students_message')}</p>
              <p className="text-sm">{t('widgets.attendance.add_students_instruction')}</p>
            </div>
          ) : (
            <ul className="student-list">
              {students.map(student => (
                <li key={student.id} className="student-item">
                  <span className="student-name">{student.name}</span>
                  {renderControls(student)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="footer">
        <div className="add-student-form">
          <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder={t('widgets.attendance.new_student_placeholder')} onKeyPress={e => e.key === 'Enter' && addStudent()} />
          <button onClick={addStudent}><UserPlus size={16}/></button>
        </div>
        <div className="actions-group">
            <button onClick={handleOpenFile} className="action-btn" title={t('widgets.attendance.import_csv_tooltip')}><FolderOpen size={16}/></button>
            <button onClick={handleExport} className="action-btn" title={t('widgets.attendance.export_records_tooltip')}><Download size={16}/></button>
            <button onClick={resetAll} className="action-btn danger" title={t('widgets.attendance.delete_all_tooltip')}><RotateCcw size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
