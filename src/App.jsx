import React, { useState, useCallback } from 'react';
import { Upload, Plus, X, Calendar, Clock, Users, BookOpen, Image, ChevronRight, ChevronLeft, GripVertical, Lock, PartyPopper, UserCheck, ClipboardList, AlertCircle } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM to 11 PM

export default function DonScheduler() {
  const [step, setStep] = useState(1);
  
  // Step 1: Classes (manual entry + image reference)
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classImages, setClassImages] = useState([]);
  const [showClassImages, setShowClassImages] = useState(true);
  
  // Step 2: RLM Calendar + Tasks
  const [rlmImage, setRlmImage] = useState(null);
  const [rlmTasks, setRlmTasks] = useState([]);
  const [newTask, setNewTask] = useState({ name: '', startDate: '', endDate: '' });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showRlmImage, setShowRlmImage] = useState(true);
  
  // Step 3: Don on Duty
  const [dodShifts, setDodShifts] = useState([]);
  const [newDodDay, setNewDodDay] = useState('Monday');
  
  // Step 4: Friday Night Hangouts (always on Friday, with start/end times)
  const [fridayHangouts, setFridayHangouts] = useState([]);
  const [newFNH, setNewFNH] = useState({ date: '', startTime: '19:00', endTime: '21:00' });
  const [isAddingFNH, setIsAddingFNH] = useState(false);
  
  // Step 5: Community Meetings
  const [communityMeetings, setCommunityMeetings] = useState([]);
  const [newMeeting, setNewMeeting] = useState({ date: '', startTime: '18:00' });
  
  // Step 6: Community Connections
  const [communitySize, setCommunitySize] = useState('');
  const [connectionDeadline, setConnectionDeadline] = useState('');
  const [completedConnections, setCompletedConnections] = useState('');
  
  // Step 7: Generated Schedule
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [draggedBlock, setDraggedBlock] = useState(null);
  
  // UI State
  const [showImageModal, setShowImageModal] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // ============ HELPER FUNCTIONS ============
  
  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? (diff / 60).toFixed(1) : 0;
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start, end) => {
    return `${formatDate(start)} → ${formatDate(end)}`;
  };

  const formatHour = (h) => {
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  // ============ FILE UPLOAD HANDLERS ============
  
  const handleClassImageUpload = (e) => {
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setClassImages(prev => [...prev, { data: ev.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRLMUpload = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setRlmImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeClassImage = (index) => setClassImages(prev => prev.filter((_, i) => i !== index));

  const handleFileDragEnter = (e) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleFileDragLeave = (e) => { e.preventDefault(); setIsDraggingFile(false); };
  const handleFileDragOver = (e) => { e.preventDefault(); };
  
  const handleFileDropClasses = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    handleClassImageUpload(e);
  };
  
  const handleFileDropRLM = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    handleRLMUpload(e);
  };

  // ============ CLASS MANAGEMENT ============
  
  const addClass = () => {
    if (newClass.name && parseInt(newClass.startTime) < parseInt(newClass.endTime)) {
      setClasses([...classes, { ...newClass, id: Date.now() }]);
      setNewClass({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
      setIsAddingClass(false);
    }
  };

  const removeClass = (id) => setClasses(classes.filter(c => c.id !== id));

  // ============ RLM TASK MANAGEMENT ============
  
  const addTask = () => {
    if (newTask.name && newTask.startDate && newTask.endDate) {
      setRlmTasks([...rlmTasks, { ...newTask, id: Date.now() }]);
      // Auto-set next task's start date to this task's end date
      setNewTask({ name: '', startDate: newTask.endDate, endDate: '' });
      setIsAddingTask(false);
    }
  };

  const removeTask = (id) => setRlmTasks(rlmTasks.filter(t => t.id !== id));

  // ============ DON ON DUTY ============
  
  const addDodShift = () => {
    if (!dodShifts.includes(newDodDay)) {
      setDodShifts([...dodShifts, newDodDay]);
      // Move to next available day
      const nextDay = DAYS.find(d => !dodShifts.includes(d) && d !== newDodDay);
      if (nextDay) setNewDodDay(nextDay);
    }
  };

  const removeDodShift = (day) => setDodShifts(dodShifts.filter(d => d !== day));

  // ============ FRIDAY NIGHT HANGOUTS ============
  
  const addFNH = () => {
    if (newFNH.date && newFNH.startTime && newFNH.endTime) {
      const hours = calculateHours(newFNH.startTime, newFNH.endTime);
      setFridayHangouts([...fridayHangouts, { ...newFNH, hours, id: Date.now() }]);
      setNewFNH({ date: '', startTime: '19:00', endTime: '21:00' });
      setIsAddingFNH(false);
    }
  };

  const removeFNH = (id) => setFridayHangouts(fridayHangouts.filter(f => f.id !== id));

  // ============ COMMUNITY MEETINGS ============
  
  const addMeeting = () => {
    if (newMeeting.date) {
      setCommunityMeetings([...communityMeetings, { ...newMeeting, id: Date.now() }]);
      setNewMeeting({ date: '', startTime: '18:00' });
    }
  };

  const removeMeeting = (id) => setCommunityMeetings(communityMeetings.filter(m => m.id !== id));

  // ============ COMMUNITY CONNECTIONS CALC ============
  
  const calculateConnections = () => {
    const size = parseInt(communitySize) || 0;
    const completed = parseInt(completedConnections) || 0;
    const remaining = Math.max(0, size - completed);
    
    if (!connectionDeadline) return { remaining, weeksLeft: 0, perWeek: 0, perDay: 0 };
    
    const today = new Date();
    const deadline = new Date(connectionDeadline);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksLeft = Math.max(0.5, (deadline - today) / msPerWeek);
    const perWeek = Math.ceil(remaining / weeksLeft);
    const perDay = Math.ceil(remaining / (weeksLeft * 7));
    
    return { remaining, weeksLeft: weeksLeft.toFixed(1), perWeek, perDay };
  };

  // Get current/upcoming RLM tasks
  const getCurrentTasks = () => {
    const today = new Date();
    return rlmTasks
      .filter(task => new Date(task.endDate + 'T23:59:59') >= today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 3);
  };

  // ============ SCHEDULE GENERATION ============
  
  const generateSchedule = () => {
    const schedule = {};
    DAYS.forEach(day => {
      schedule[day] = HOURS.map(hour => ({ hour, block: null }));
    });

    // 1. Add classes (LOCKED) - These are properly set from manual entry
    classes.forEach(cls => {
      const daySchedule = schedule[cls.day];
      if (daySchedule) {
        for (let h = parseInt(cls.startTime); h < parseInt(cls.endTime); h++) {
          const hourSlot = daySchedule.find(d => d.hour === h);
          if (hourSlot && !hourSlot.block) {
            hourSlot.block = { type: 'class', name: cls.name, locked: true };
          }
        }
      }
    });

    // 2. Add Don on Duty shifts 8-10pm (LOCKED)
    dodShifts.forEach(day => {
      const daySchedule = schedule[day];
      if (daySchedule) {
        for (let h = 20; h <= 22; h++) {
          const hourSlot = daySchedule.find(d => d.hour === h);
          if (hourSlot && !hourSlot.block) {
            hourSlot.block = { type: 'dod', name: 'Don on Duty', locked: true };
          }
        }
      }
    });

    // 3. Add Friday Night Hangouts (LOCKED) - using actual time inputs
    fridayHangouts.forEach(fnh => {
      const daySchedule = schedule['Friday'];
      if (daySchedule && fnh.startTime && fnh.endTime) {
        const startHour = parseInt(fnh.startTime.split(':')[0]);
        const endHour = parseInt(fnh.endTime.split(':')[0]);
        for (let h = startHour; h < endHour; h++) {
          const hourSlot = daySchedule.find(d => d.hour === h);
          if (hourSlot && !hourSlot.block) {
            hourSlot.block = { type: 'hangout', name: 'Friday Hangout', locked: true };
          }
        }
      }
    });

    // 4. Add Community Meetings (LOCKED)
    communityMeetings.forEach(meeting => {
      const meetingDate = new Date(meeting.date + 'T12:00:00');
      const dayOfWeek = meetingDate.getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      const daySchedule = schedule[dayName];
      if (daySchedule && meeting.startTime) {
        const startHour = parseInt(meeting.startTime.split(':')[0]);
        const hourSlot = daySchedule.find(d => d.hour === startHour);
        if (hourSlot && !hourSlot.block) {
          hourSlot.block = { type: 'meeting', name: 'Community Mtg', locked: true };
        }
      }
    });

    // 5. Add meals
    const mealTimes = [
      { name: 'Breakfast', start: 8, end: 9 },
      { name: 'Lunch', start: 12, end: 13 },
      { name: 'Dinner', start: 18, end: 19 }
    ];

    DAYS.forEach(day => {
      mealTimes.forEach(meal => {
        for (let h = meal.start; h < meal.end; h++) {
          const hourSlot = schedule[day].find(d => d.hour === h);
          if (hourSlot && !hourSlot.block) {
            hourSlot.block = { type: 'meal', name: meal.name, locked: false };
          }
        }
      });
    });

    // 6. Add personal time (3 hours/day)
    DAYS.forEach(day => {
      let personalAdded = 0;
      for (let h = 14; h <= 22 && personalAdded < 3; h++) {
        const hourSlot = schedule[day].find(d => d.hour === h);
        if (hourSlot && !hourSlot.block) {
          hourSlot.block = { type: 'personal', name: 'Personal Time', locked: false };
          personalAdded++;
        }
      }
    });

    // 7. Add study time (~10 hours/week)
    const studyPerDay = { Monday: 2, Tuesday: 2, Wednesday: 1, Thursday: 2, Friday: 1, Saturday: 1, Sunday: 1 };
    DAYS.forEach(day => {
      let studyAdded = 0;
      const target = studyPerDay[day];
      for (let h = 9; h <= 21 && studyAdded < target; h++) {
        const hourSlot = schedule[day].find(d => d.hour === h);
        if (hourSlot && !hourSlot.block) {
          hourSlot.block = { type: 'study', name: 'Study Time', locked: false };
          studyAdded++;
        }
      }
    });

    // 8. Fill remaining with free time
    DAYS.forEach(day => {
      for (let h = 9; h <= 22; h++) {
        const hourSlot = schedule[day].find(d => d.hour === h);
        if (hourSlot && !hourSlot.block) {
          hourSlot.block = { type: 'social', name: 'Free Time', locked: false };
        }
      }
    });

    setGeneratedSchedule(schedule);
    setStep(7);
  };

  // ============ DRAG AND DROP SCHEDULE BLOCKS ============
  
  const handleBlockDragStart = (day, hour, block) => {
    if (block.locked) return;
    setDraggedBlock({ day, hour, block });
  };

  const handleBlockDrop = (targetDay, targetHour) => {
    if (!draggedBlock || !generatedSchedule) return;
    
    const targetSlot = generatedSchedule[targetDay].find(d => d.hour === targetHour);
    if (!targetSlot || targetSlot.block?.locked) return;
    
    const newSchedule = { ...generatedSchedule };
    const sourceSlot = newSchedule[draggedBlock.day].find(d => d.hour === draggedBlock.hour);
    const sourceBlock = sourceSlot.block;
    sourceSlot.block = targetSlot.block;
    targetSlot.block = sourceBlock;
    
    setGeneratedSchedule(newSchedule);
    setDraggedBlock(null);
  };

  const handleBlockDragEnd = () => setDraggedBlock(null);

  // ============ STYLES ============
  
  const connectionStats = calculateConnections();
  const currentTasks = getCurrentTasks();

  const getBlockStyle = (type) => {
    const styles = {
      class: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' },
      dod: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' },
      hangout: { background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: 'white' },
      meeting: { background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', color: 'white' },
      meal: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' },
      personal: { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#1a1a2e' },
      study: { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#1a1a2e' },
      social: { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#1a1a2e' }
    };
    return styles[type] || {};
  };

  const totalSteps = 7;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      color: '#e8e8e8',
      padding: '20px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 20px;
        }
        
        .step-indicator { display: flex; gap: 8px; margin-bottom: 30px; justify-content: center; flex-wrap: wrap; }
        
        .step-dot {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px; cursor: pointer;
          transition: all 0.3s ease; border: 2px solid transparent;
        }
        .step-dot.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4); transform: scale(1.1); }
        .step-dot.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #1a1a2e; }
        .step-dot.inactive { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none; padding: 14px 28px; border-radius: 12px;
          color: white; font-weight: 700; font-size: 16px; cursor: pointer;
          transition: all 0.3s ease; font-family: inherit;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px; border-radius: 12px;
          color: white; font-weight: 600; cursor: pointer;
          transition: all 0.3s ease; font-family: inherit;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
        
        .btn-add {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e; padding: 10px 18px; border-radius: 10px;
          font-weight: 600; cursor: pointer; font-family: inherit;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .input-field {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px; padding: 14px 18px;
          color: white; font-size: 16px; width: 100%;
          font-family: inherit; transition: all 0.3s ease;
        }
        .input-field:focus { outline: none; border-color: #667eea; box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
        .input-field::placeholder { color: rgba(255, 255, 255, 0.4); }
        select.input-field { cursor: pointer; }
        select.input-field option { background: #302b63; color: white; }
        
        .tag {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 30px; margin: 5px;
          font-size: 14px; font-weight: 600;
        }
        .tag button {
          background: rgba(255, 255, 255, 0.2); border: none;
          width: 22px; height: 22px; border-radius: 50%;
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .tag.class { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .tag.dod { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
        .tag.meeting { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; }
        .tag.fnh { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; }
        .tag.task { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; }
        
        .upload-zone {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 16px; padding: 30px; text-align: center;
          cursor: pointer; transition: all 0.3s ease;
        }
        .upload-zone:hover, .upload-zone.dragging { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }
        
        .info-box {
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px; padding: 15px 20px;
          margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px;
          font-size: 14px; line-height: 1.5;
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border-radius: 16px; padding: 20px; text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-number {
          font-size: 36px; font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .stat-label { font-size: 12px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        
        .schedule-grid { display: grid; grid-template-columns: 55px repeat(7, 1fr); gap: 3px; font-size: 10px; }
        .schedule-header { background: rgba(102, 126, 234, 0.3); padding: 10px 4px; text-align: center; font-weight: 700; border-radius: 8px; font-size: 11px; }
        .schedule-time { background: rgba(255, 255, 255, 0.05); padding: 6px 2px; text-align: center; font-size: 9px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .schedule-cell {
          min-height: 38px; border-radius: 6px; padding: 3px;
          display: flex; align-items: center; justify-content: center;
          text-align: center; font-weight: 600; font-size: 8px; line-height: 1.2;
          position: relative; transition: all 0.2s ease;
        }
        .schedule-cell.draggable { cursor: grab; }
        .schedule-cell.draggable:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .schedule-cell.drag-over { outline: 2px dashed #667eea; outline-offset: -2px; }
        .schedule-cell .lock-icon { position: absolute; top: 2px; right: 2px; opacity: 0.6; }
        
        .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; justify-content: center; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .legend-color { width: 16px; height: 16px; border-radius: 4px; }
        
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-content img { max-width: 90vw; max-height: 85vh; border-radius: 12px; }
        
        .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-top: 12px; }
        .image-thumb { position: relative; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); }
        .image-thumb img { width: 100%; height: 80px; object-fit: cover; cursor: pointer; }
        .image-thumb .remove-btn {
          position: absolute; top: 4px; right: 4px;
          background: rgba(239, 68, 68, 0.9); border: none;
          width: 20px; height: 20px; border-radius: 4px;
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        
        h1 {
          font-family: 'Playfair Display', serif; font-size: 42px;
          text-align: center; margin-bottom: 10px;
          background: linear-gradient(135deg, #fff 0%, #a8edea 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #fff; display: flex; align-items: center; gap: 10px; }
        .subtitle { text-align: center; opacity: 0.7; margin-bottom: 30px; font-size: 16px; }
        .section-desc { opacity: 0.7; margin-bottom: 20px; font-size: 14px; }
        
        .toggle-container { display: flex; align-items: center; gap: 15px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 14px; margin-bottom: 20px; }
        .toggle { width: 56px; height: 30px; background: rgba(255, 255, 255, 0.2); border-radius: 15px; position: relative; cursor: pointer; transition: all 0.3s ease; }
        .toggle.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .toggle::after { content: ''; position: absolute; width: 24px; height: 24px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: all 0.3s ease; }
        .toggle.active::after { left: 29px; }
        
        .nav-buttons { display: flex; justify-content: space-between; margin-top: 25px; }
        .form-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 15px; }
        .form-section { padding: 20px; background: rgba(255,255,255,0.05); border-radius: 14px; margin-bottom: 20px; }
        
        .task-card {
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px; padding: 15px; margin-bottom: 10px;
        }
        .task-card .task-name { font-weight: 700; font-size: 15px; margin-bottom: 5px; }
        .task-card .task-dates { font-size: 13px; opacity: 0.8; }
        
        .drag-hint {
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px; padding: 15px 20px; margin-bottom: 20px;
          display: flex; align-items: center; gap: 12px; font-size: 14px;
        }
      `}</style>

      <h1>Don Schedule Manager</h1>
      <p className="subtitle">Balance your classes, don duties, and personal time</p>

      {/* Step Indicator */}
      <div className="step-indicator">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <div
            key={s}
            className={`step-dot ${step === s ? 'active' : step > s ? 'completed' : 'inactive'}`}
            onClick={() => s <= step && setStep(s)}
          >
            {step > s ? '✓' : s}
          </div>
        ))}
      </div>

      {/* ============ STEP 1: CLASSES ============ */}
      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><BookOpen size={24} /> Class Schedule</h2>
          <p className="section-desc">Add your classes manually. Upload schedule photos for reference.</p>
          
          <div className="info-box">
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>How it works:</strong> Upload your schedule screenshot(s) as a visual reference, 
              then add each class below. The schedule generator will block off your class times automatically.
            </div>
          </div>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDraggingFile ? 'dragging' : ''}`}
            onDragEnter={handleFileDragEnter}
            onDragLeave={handleFileDragLeave}
            onDragOver={handleFileDragOver}
            onDrop={handleFileDropClasses}
            style={{ marginBottom: 20 }}
          >
            <Image size={36} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Drag & drop schedule screenshots (for reference)
            </div>
            <div style={{ opacity: 0.6, fontSize: 13 }}>or click the button below</div>
          </div>

          <div className="form-row">
            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={18} /> Upload Photos
              <input type="file" accept="image/*" multiple onChange={handleClassImageUpload} style={{ display: 'none' }} />
            </label>
            {!isAddingClass && (
              <button className="btn-add" onClick={() => setIsAddingClass(true)}>
                <Plus size={18} /> Add Class
              </button>
            )}
          </div>

          {/* Uploaded Images */}
          {classImages.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowClassImages(!showClassImages)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 8, color: '#a855f7', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                {showClassImages ? '▼' : '▶'} {classImages.length} reference photo{classImages.length > 1 ? 's' : ''}
              </button>
              {showClassImages && (
                <div className="image-grid">
                  {classImages.map((img, idx) => (
                    <div key={idx} className="image-thumb">
                      <img src={img.data} alt={img.name} onClick={() => setShowImageModal(img.data)} />
                      <button className="remove-btn" onClick={() => removeClassImage(idx)}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Add Form */}
          {isAddingClass && (
            <div className="form-section">
              <div className="form-row">
                <input
                  className="input-field"
                  placeholder="Class name (e.g., PSYCH 101)"
                  value={newClass.name}
                  onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                  style={{ flex: 1, minWidth: 150 }}
                />
                <select className="input-field" value={newClass.day} onChange={e => setNewClass({ ...newClass, day: e.target.value })} style={{ width: 'auto' }}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <select className="input-field" value={newClass.startTime} onChange={e => setNewClass({ ...newClass, startTime: e.target.value })} style={{ width: 'auto' }}>
                  {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
                <span style={{ color: '#64748b' }}>to</span>
                <select className="input-field" value={newClass.endTime} onChange={e => setNewClass({ ...newClass, endTime: e.target.value })} style={{ width: 'auto' }}>
                  {HOURS.slice(1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
                <button className="btn-add" onClick={addClass}>Save</button>
                <button className="btn-secondary" onClick={() => setIsAddingClass(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Class List */}
          {classes.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Classes ({classes.length}):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {classes.map(cls => (
                  <span key={cls.id} className="tag class">
                    {cls.name} • {cls.day.slice(0, 3)} {formatHour(parseInt(cls.startTime))}-{formatHour(parseInt(cls.endTime))}
                    <button onClick={() => removeClass(cls.id)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {classes.length === 0 && !isAddingClass && (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 20, textAlign: 'center', padding: 20 }}>
              No classes added yet. Click "Add Class" to enter your schedule.
            </div>
          )}

          <div className="nav-buttons">
            <div></div>
            <button className="btn-primary" onClick={() => setStep(2)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 2: RLM CALENDAR + TASKS ============ */}
      {step === 2 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><ClipboardList size={24} /> RLM Calendar & Tasks</h2>
          <p className="section-desc">Upload your RLM calendar for reference, then add the tasks and their due date ranges.</p>
          
          <div className="info-box">
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>How it works:</strong> Upload your RLM calendar image as a reference. 
              Then manually add each task with its date window (e.g., "Community Connections #1 Due" from Aug 31 → Sept 8).
              Tasks will auto-chain - the next task starts where the previous ends.
            </div>
          </div>

          {/* RLM Upload Zone */}
          <input type="file" accept="image/*" onChange={handleRLMUpload} style={{ display: 'none' }} id="rlm-upload" />
          
          {!rlmImage ? (
            <label
              htmlFor="rlm-upload"
              className={`upload-zone ${isDraggingFile ? 'dragging' : ''}`}
              style={{ display: 'block', marginBottom: 20 }}
              onDragEnter={handleFileDragEnter}
              onDragLeave={handleFileDragLeave}
              onDragOver={handleFileDragOver}
              onDrop={handleFileDropRLM}
            >
              <Calendar size={36} style={{ opacity: 0.5, marginBottom: 10 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Drag & drop or click to upload RLM calendar</div>
              <div style={{ opacity: 0.6, marginTop: 6, fontSize: 13 }}>This will be your reference for adding tasks</div>
            </label>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowRlmImage(!showRlmImage)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 8, color: '#a855f7', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10
                }}
              >
                {showRlmImage ? '▼' : '▶'} RLM Calendar Reference
              </button>
              {showRlmImage && (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={rlmImage}
                    alt="RLM Calendar"
                    style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 12, cursor: 'pointer' }}
                    onClick={() => setShowImageModal(rlmImage)}
                  />
                  <div style={{ marginTop: 10 }}>
                    <label htmlFor="rlm-upload" className="btn-secondary" style={{ display: 'inline-flex', fontSize: 13, padding: '8px 16px' }}>
                      Replace Image
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Entry */}
          <div style={{ marginTop: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 RLM Tasks & Deadlines</h3>
              {!isAddingTask && (
                <button className="btn-add" onClick={() => setIsAddingTask(true)}>
                  <Plus size={18} /> Add Task
                </button>
              )}
            </div>

            {isAddingTask && (
              <div className="form-section">
                <div className="form-row">
                  <input
                    className="input-field"
                    placeholder="Task name (e.g., Community Connections #1 Due)"
                    value={newTask.name}
                    onChange={e => setNewTask({ ...newTask, name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="form-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Window Start</label>
                    <input
                      type="date"
                      className="input-field"
                      value={newTask.startDate}
                      onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Window End (Due Date)</label>
                    <input
                      type="date"
                      className="input-field"
                      value={newTask.endDate}
                      onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <button className="btn-add" onClick={addTask} disabled={!newTask.name || !newTask.startDate || !newTask.endDate}>
                    Save Task
                  </button>
                  <button className="btn-secondary" onClick={() => setIsAddingTask(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Task List */}
            {rlmTasks.length > 0 ? (
              <div>
                {rlmTasks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).map((task, idx) => (
                  <div key={task.id} className="task-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="task-name">{idx + 1}. {task.name}</div>
                        <div className="task-dates">{formatDateRange(task.startDate, task.endDate)}</div>
                      </div>
                      <button
                        onClick={() => removeTask(task.id)}
                        style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                No tasks added yet. Use your RLM calendar reference to add deadlines.
              </div>
            )}
          </div>

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 3: DON ON DUTY ============ */}
      {step === 3 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Clock size={24} /> Don on Duty Shifts</h2>
          <p className="section-desc">Select which days you have Don on Duty (8-10 PM). Usually 2-3 shifts per week.</p>
          
          <div className="form-row">
            <select className="input-field" value={newDodDay} onChange={e => setNewDodDay(e.target.value)} style={{ width: 'auto' }}>
              {DAYS.filter(d => !dodShifts.includes(d)).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn-add" onClick={addDodShift} disabled={dodShifts.length >= 7 || DAYS.filter(d => !dodShifts.includes(d)).length === 0}>
              <Plus size={18} /> Add Shift
            </button>
          </div>

          {dodShifts.length > 0 ? (
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your DOD Shifts (8-10 PM):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {dodShifts.map(day => (
                  <span key={day} className="tag dod">
                    {day}
                    <button onClick={() => removeDodShift(day)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 15, textAlign: 'center', padding: 20 }}>
              No DOD shifts added yet
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(4)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 4: FRIDAY NIGHT HANGOUTS ============ */}
      {step === 4 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><PartyPopper size={24} /> Friday Night Hangouts</h2>
          <p className="section-desc">Add your assigned Friday Night Hangout shifts with date and times.</p>
          
          <div className="info-box">
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              FNH events are always on Fridays. Enter the date and your shift times - hours worked will be calculated automatically.
            </div>
          </div>

          {!isAddingFNH && (
            <button className="btn-add" onClick={() => setIsAddingFNH(true)} style={{ marginBottom: 20 }}>
              <Plus size={18} /> Add Friday Hangout
            </button>
          )}

          {isAddingFNH && (
            <div className="form-section">
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Friday Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newFNH.date}
                    onChange={e => setNewFNH({ ...newFNH, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Start Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={newFNH.startTime}
                    onChange={e => setNewFNH({ ...newFNH, startTime: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>End Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={newFNH.endTime}
                    onChange={e => setNewFNH({ ...newFNH, endTime: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Total Hours</label>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#667eea' }}>
                    {calculateHours(newFNH.startTime, newFNH.endTime)}h
                  </div>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <button className="btn-add" onClick={addFNH} disabled={!newFNH.date || !newFNH.startTime || !newFNH.endTime}>
                  Save Hangout
                </button>
                <button className="btn-secondary" onClick={() => setIsAddingFNH(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* FNH List */}
          {fridayHangouts.length > 0 ? (
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Friday Hangouts:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {fridayHangouts.sort((a, b) => new Date(a.date) - new Date(b.date)).map(fnh => (
                  <span key={fnh.id} className="tag fnh">
                    {formatDate(fnh.date)} • {formatTime(fnh.startTime)}-{formatTime(fnh.endTime)} ({fnh.hours}h)
                    <button onClick={() => removeFNH(fnh.id)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
              No Friday hangouts added yet
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(5)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 5: COMMUNITY MEETINGS ============ */}
      {step === 5 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><UserCheck size={24} /> Community Meetings</h2>
          <p className="section-desc">Add your scheduled community meetings (~30 min each)</p>
          
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <input
                type="date"
                className="input-field"
                value={newMeeting.date}
                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                placeholder="Meeting date"
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="time"
                className="input-field"
                value={newMeeting.startTime}
                onChange={e => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
              />
            </div>
            <button className="btn-add" onClick={addMeeting} disabled={!newMeeting.date}>
              <Plus size={18} /> Add Meeting
            </button>
          </div>

          {communityMeetings.length > 0 ? (
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Scheduled Meetings:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {communityMeetings.sort((a, b) => new Date(a.date) - new Date(b.date)).map(meeting => (
                  <span key={meeting.id} className="tag meeting">
                    {formatDate(meeting.date)} @ {formatTime(meeting.startTime)}
                    <button onClick={() => removeMeeting(meeting.id)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
              No community meetings added yet
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(4)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(6)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 6: COMMUNITY CONNECTIONS ============ */}
      {step === 6 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Users size={24} /> Community Connections</h2>
          <p className="section-desc">Track your connection goals and deadlines</p>
          
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 25 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Community Size</label>
              <input className="input-field" type="number" placeholder="# of residents" value={communitySize} onChange={e => setCommunitySize(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Completed</label>
              <input className="input-field" type="number" placeholder="Already done" value={completedConnections} onChange={e => setCompletedConnections(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Deadline</label>
              <input className="input-field" type="date" value={connectionDeadline} onChange={e => setConnectionDeadline(e.target.value)} />
            </div>
          </div>

          {communitySize && connectionDeadline && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-number">{connectionStats.remaining}</div>
                <div className="stat-label">Remaining</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{connectionStats.weeksLeft}</div>
                <div className="stat-label">Weeks Left</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{connectionStats.perWeek}</div>
                <div className="stat-label">Per Week</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{connectionStats.perDay}</div>
                <div className="stat-label">Per Day</div>
              </div>
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(5)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={generateSchedule}>Generate Schedule <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 7: GENERATED SCHEDULE ============ */}
      {step === 7 && generatedSchedule && (
        <div className="glass-card">
          <h2><Calendar size={24} /> Your Weekly Schedule</h2>
          
          <div className="drag-hint">
            <GripVertical size={20} />
            <div>
              <strong>Drag to rearrange!</strong> Blocks with 🔒 are locked (classes, DOD, hangouts, meetings). 
              Personal time, study, and meals can be moved around.
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div className="schedule-grid" style={{ minWidth: 650 }}>
              <div className="schedule-header"></div>
              {DAYS.map(day => (
                <div key={day} className="schedule-header">{day.slice(0, 3)}</div>
              ))}
              
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="schedule-time">{formatHour(hour)}</div>
                  {DAYS.map(day => {
                    const hourData = generatedSchedule[day].find(h => h.hour === hour);
                    const block = hourData?.block;
                    const isDraggable = block && !block.locked;
                    
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`schedule-cell ${isDraggable ? 'draggable' : ''}`}
                        style={block ? getBlockStyle(block.type) : { background: 'rgba(255,255,255,0.03)' }}
                        draggable={isDraggable}
                        onDragStart={() => isDraggable && handleBlockDragStart(day, hour, block)}
                        onDragEnd={handleBlockDragEnd}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                        onDrop={(e) => { e.currentTarget.classList.remove('drag-over'); handleBlockDrop(day, hour); }}
                      >
                        {block?.name || ''}
                        {block?.locked && <Lock size={8} className="lock-icon" />}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="legend">
            {[
              { type: 'class', label: 'Classes 🔒' },
              { type: 'dod', label: 'DOD 🔒' },
              { type: 'hangout', label: 'FNH 🔒' },
              { type: 'meeting', label: 'Meeting 🔒' },
              { type: 'meal', label: 'Meals' },
              { type: 'study', label: 'Study' },
              { type: 'personal', label: 'Personal' },
              { type: 'social', label: 'Free' }
            ].map(item => (
              <div key={item.type} className="legend-item">
                <div className="legend-color" style={getBlockStyle(item.type)}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* RLM Tasks Summary */}
          {currentTasks.length > 0 && (
            <div style={{ marginTop: 25 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>📋 Upcoming RLM Tasks</h3>
              {currentTasks.map((task, idx) => (
                <div key={task.id} className="task-card" style={{ marginBottom: 8 }}>
                  <div className="task-name">{task.name}</div>
                  <div className="task-dates">Due: {formatDateRange(task.startDate, task.endDate)}</div>
                </div>
              ))}
            </div>
          )}

          {/* RLM Image Reference */}
          {rlmImage && (
            <div style={{ marginTop: 25 }}>
              <h3 style={{ marginBottom: 10, fontSize: 16 }}>📅 RLM Calendar Reference</h3>
              <img
                src={rlmImage}
                alt="RLM Calendar"
                style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, cursor: 'pointer' }}
                onClick={() => setShowImageModal(rlmImage)}
              />
            </div>
          )}

          {/* Connection Stats */}
          {communitySize && (
            <div style={{ marginTop: 25, padding: 20, background: 'rgba(102, 126, 234, 0.15)', borderRadius: 14, border: '1px solid rgba(102, 126, 234, 0.3)' }}>
              <h3 style={{ marginBottom: 8, fontSize: 16 }}>🤝 Community Connections</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                <strong>{connectionStats.remaining}</strong> remaining • <strong>{connectionStats.perWeek}/week</strong> to meet deadline
              </p>
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(6)}><ChevronLeft size={20} /> Edit</button>
            <button className="btn-secondary" onClick={() => { setStep(1); setGeneratedSchedule(null); }}>Start Over</button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <div className="modal-content">
            <img src={showImageModal} alt="Full Size" />
          </div>
        </div>
      )}
    </div>
  );
}
