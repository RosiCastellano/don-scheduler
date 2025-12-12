import React, { useState, useCallback, useRef } from 'react';
import { Upload, Plus, X, Calendar, Clock, Users, BookOpen, Image, ChevronRight, ChevronLeft, GripVertical, Lock, PartyPopper, UserCheck } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM to 11 PM

export default function DonScheduler() {
  const [step, setStep] = useState(1);
  
  // Step 1: Classes
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classImages, setClassImages] = useState([]);
  const [showClassImages, setShowClassImages] = useState(false);
  
  // Step 2: RLM Calendar
  const [rlmImage, setRlmImage] = useState(null);
  
  // Step 3: Don on Duty
  const [dodShifts, setDodShifts] = useState([]);
  const [newDodDay, setNewDodDay] = useState('Monday');
  
  // Step 4: Friday Night Hangout
  const [hasFridayHangout, setHasFridayHangout] = useState(false);
  const [fridayHangoutDate, setFridayHangoutDate] = useState('');
  const [fridayHangoutHours, setFridayHangoutHours] = useState('2');
  
  // Step 5: Community Meetings
  const [communityMeetings, setCommunityMeetings] = useState([]);
  const [newMeetingDate, setNewMeetingDate] = useState('');
  
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

  // ============ FILE UPLOAD HANDLERS ============
  
  const handleClassImageUpload = (e) => {
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setClassImages(prev => [...prev, { data: e.target.result, name: file.name }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRLMUpload = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setRlmImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeClassImage = (index) => {
    setClassImages(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop for file uploads
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

  const removeClass = (id) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  // ============ DON ON DUTY ============
  
  const addDodShift = () => {
    if (!dodShifts.includes(newDodDay)) {
      setDodShifts([...dodShifts, newDodDay]);
    }
  };

  const removeDodShift = (day) => {
    setDodShifts(dodShifts.filter(d => d !== day));
  };

  // ============ COMMUNITY MEETINGS ============
  
  const addMeeting = () => {
    if (newMeetingDate && !communityMeetings.includes(newMeetingDate)) {
      setCommunityMeetings([...communityMeetings, newMeetingDate]);
      setNewMeetingDate('');
    }
  };

  const removeMeeting = (date) => {
    setCommunityMeetings(communityMeetings.filter(d => d !== date));
  };

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

  // ============ SCHEDULE GENERATION ============
  
  const generateSchedule = () => {
    const schedule = {};
    DAYS.forEach(day => {
      schedule[day] = HOURS.map(hour => ({ hour, block: null }));
    });

    // 1. Add classes (LOCKED)
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

    // 3. Add Friday Night Hangout (LOCKED)
    if (hasFridayHangout && fridayHangoutDate) {
      const hangoutHours = parseInt(fridayHangoutHours) || 2;
      const daySchedule = schedule['Friday'];
      if (daySchedule) {
        let added = 0;
        for (let h = 19; h <= 23 && added < hangoutHours; h++) {
          const hourSlot = daySchedule.find(d => d.hour === h);
          if (hourSlot && !hourSlot.block) {
            hourSlot.block = { type: 'hangout', name: 'Friday Hangout', locked: true };
            added++;
          }
        }
      }
    }

    // 4. Add meals (suggested but movable)
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

    // 5. Add personal time (3 hours/day, DRAGGABLE)
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

    // 6. Add study time (DRAGGABLE) - aim for ~10 hours/week
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

    // 7. Fill remaining afternoon/evening with social time
    DAYS.forEach(day => {
      for (let h = 14; h <= 22; h++) {
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
    if (!draggedBlock) return;
    if (!generatedSchedule) return;
    
    const targetSlot = generatedSchedule[targetDay].find(d => d.hour === targetHour);
    if (!targetSlot) return;
    
    // Can't drop on locked blocks
    if (targetSlot.block?.locked) return;
    
    // Swap or move
    const newSchedule = { ...generatedSchedule };
    
    // Clear source
    const sourceSlot = newSchedule[draggedBlock.day].find(d => d.hour === draggedBlock.hour);
    const sourceBlock = sourceSlot.block;
    sourceSlot.block = targetSlot.block; // Swap
    
    // Set target
    targetSlot.block = sourceBlock;
    
    setGeneratedSchedule(newSchedule);
    setDraggedBlock(null);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlock(null);
  };

  // ============ HELPERS ============
  
  const connectionStats = calculateConnections();

  const getBlockStyle = (type, locked) => {
    const styles = {
      class: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' },
      dod: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' },
      hangout: { background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: 'white' },
      meal: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' },
      personal: { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#1a1a2e' },
      study: { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#1a1a2e' },
      social: { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#1a1a2e' }
    };
    return styles[type] || {};
  };

  const formatHour = (h) => {
    if (h === 12) return '12 PM';
    if (h > 12) return `${h - 12} PM`;
    return `${h} AM`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        
        .step-indicator {
          display: flex;
          gap: 8px;
          margin-bottom: 30px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .step-dot {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .step-dot.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
          transform: scale(1.1);
        }
        
        .step-dot.completed {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: #1a1a2e;
        }
        
        .step-dot.inactive {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .btn-add {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #22c55e;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .input-field {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 14px 18px;
          color: white;
          font-size: 16px;
          width: 100%;
          font-family: inherit;
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
        }
        
        .input-field::placeholder { color: rgba(255, 255, 255, 0.4); }
        select.input-field { cursor: pointer; }
        select.input-field option { background: #302b63; color: white; }
        
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 30px;
          margin: 5px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .tag button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .tag.class { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .tag.dod { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
        .tag.meeting { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; }
        
        .upload-zone {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .upload-zone:hover, .upload-zone.dragging {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-number {
          font-size: 36px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .stat-label {
          font-size: 12px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 5px;
        }
        
        .schedule-grid {
          display: grid;
          grid-template-columns: 55px repeat(7, 1fr);
          gap: 3px;
          font-size: 10px;
        }
        
        .schedule-header {
          background: rgba(102, 126, 234, 0.3);
          padding: 10px 4px;
          text-align: center;
          font-weight: 700;
          border-radius: 8px;
          font-size: 11px;
        }
        
        .schedule-time {
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 2px;
          text-align: center;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        
        .schedule-cell {
          min-height: 38px;
          border-radius: 6px;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          font-size: 8px;
          line-height: 1.2;
          position: relative;
          transition: all 0.2s ease;
        }
        
        .schedule-cell.draggable {
          cursor: grab;
        }
        
        .schedule-cell.draggable:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .schedule-cell.drag-over {
          outline: 2px dashed #667eea;
          outline-offset: -2px;
        }
        
        .schedule-cell .lock-icon {
          position: absolute;
          top: 2px;
          right: 2px;
          opacity: 0.6;
        }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
          justify-content: center;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content img {
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 12px;
        }
        
        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }
        
        .image-thumb {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .image-thumb img {
          width: 100%;
          height: 80px;
          object-fit: cover;
          cursor: pointer;
        }
        
        .image-thumb .remove-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(239, 68, 68, 0.9);
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        h1 {
          font-family: 'Playfair Display', serif;
          font-size: 42px;
          text-align: center;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #fff 0%, #a8edea 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .subtitle { text-align: center; opacity: 0.7; margin-bottom: 30px; font-size: 16px; }
        .section-desc { opacity: 0.7; margin-bottom: 20px; font-size: 14px; }
        
        .toggle-container {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          margin-bottom: 20px;
        }
        
        .toggle {
          width: 56px;
          height: 30px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .toggle.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .toggle::after {
          content: '';
          position: absolute;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: all 0.3s ease;
        }
        
        .toggle.active::after {
          left: 29px;
        }
        
        .nav-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
        }
        
        .form-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .drag-hint {
          background: rgba(102, 126, 234, 0.15);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 15px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
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
          <p className="section-desc">Upload photos of your class schedule or add classes manually</p>
          
          {/* Upload Zone */}
          <div
            className={`upload-zone ${isDraggingFile ? 'dragging' : ''}`}
            onDragEnter={handleFileDragEnter}
            onDragLeave={handleFileDragLeave}
            onDragOver={handleFileDragOver}
            onDrop={handleFileDropClasses}
            style={{ marginBottom: 20 }}
          >
            <Image size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              Drag & drop class schedule screenshots
            </div>
            <div style={{ opacity: 0.6, fontSize: 14 }}>
              or click below to upload
            </div>
          </div>

          <div className="form-row">
            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={18} /> Upload Photos
              <input type="file" accept="image/*" multiple onChange={handleClassImageUpload} style={{ display: 'none' }} />
            </label>
            {!isAddingClass && (
              <button className="btn-secondary" onClick={() => setIsAddingClass(true)}>
                <Plus size={18} /> Add Manually
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
                {showClassImages ? '▼' : '▶'} {classImages.length} photo{classImages.length > 1 ? 's' : ''} uploaded
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
            <div style={{ padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 20 }}>
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
              <div className="form-row">
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
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Your Classes:</div>
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

          {classes.length === 0 && classImages.length === 0 && !isAddingClass && (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 20 }}>
              Upload schedule photos or add classes manually
            </div>
          )}

          <div className="nav-buttons">
            <div></div>
            <button className="btn-primary" onClick={() => setStep(2)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 2: RLM CALENDAR ============ */}
      {step === 2 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Calendar size={24} /> RLM Calendar</h2>
          <p className="section-desc">Upload a photo of your monthly RLM calendar</p>
          
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
              <Calendar size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Drag & drop or click to upload</div>
              <div style={{ opacity: 0.6, marginTop: 8, fontSize: 14 }}>Your monthly RLM calendar photo</div>
            </label>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img
                src={rlmImage}
                alt="RLM Calendar"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 12, cursor: 'pointer' }}
                onClick={() => setShowImageModal(rlmImage)}
              />
              <p style={{ opacity: 0.6, marginTop: 10, fontSize: 13 }}>Click to enlarge</p>
              <label htmlFor="rlm-upload" className="btn-secondary" style={{ display: 'inline-flex', marginTop: 10 }}>
                Replace Image
              </label>
            </div>
          )}

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
          <p className="section-desc">Select which days you have Don on Duty (8-10 PM)</p>
          
          <div className="form-row">
            <select className="input-field" value={newDodDay} onChange={e => setNewDodDay(e.target.value)} style={{ width: 'auto' }}>
              {DAYS.filter(d => !dodShifts.includes(d)).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn-add" onClick={addDodShift} disabled={dodShifts.length >= 7}>
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
            <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 15 }}>
              No DOD shifts added yet (typically 2-3 per week)
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(4)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {/* ============ STEP 4: FRIDAY NIGHT HANGOUT ============ */}
      {step === 4 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><PartyPopper size={24} /> Friday Night Hangout</h2>
          <p className="section-desc">Are you assigned a Friday Night Hangout this month?</p>
          
          <div className="toggle-container">
            <div className={`toggle ${hasFridayHangout ? 'active' : ''}`} onClick={() => setHasFridayHangout(!hasFridayHangout)} />
            <span style={{ fontWeight: 600 }}>{hasFridayHangout ? 'Yes, I have a Friday Hangout' : 'No Friday Hangout this month'}</span>
          </div>

          {hasFridayHangout && (
            <div style={{ padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
              <div className="form-row">
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Which Friday?</label>
                  <input
                    type="date"
                    className="input-field"
                    value={fridayHangoutDate}
                    onChange={e => setFridayHangoutDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>How many hours?</label>
                  <select className="input-field" value={fridayHangoutHours} onChange={e => setFridayHangoutHours(e.target.value)}>
                    {[1, 2, 3, 4, 5].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
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
            <input
              type="date"
              className="input-field"
              value={newMeetingDate}
              onChange={e => setNewMeetingDate(e.target.value)}
              style={{ width: 'auto' }}
            />
            <button className="btn-add" onClick={addMeeting} disabled={!newMeetingDate}>
              <Plus size={18} /> Add Meeting
            </button>
          </div>

          {communityMeetings.length > 0 ? (
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Scheduled Meetings:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {communityMeetings.sort().map(date => (
                  <span key={date} className="tag meeting">
                    {formatDate(date)}
                    <button onClick={() => removeMeeting(date)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 15 }}>
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
          <p className="section-desc">Track your connection goals</p>
          
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
            <div>
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
              <strong>Drag to rearrange!</strong> Blocks with 🔒 are locked (classes, DOD). 
              Personal time, study time, and meals can be moved around.
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
                        style={block ? getBlockStyle(block.type, block.locked) : { background: 'rgba(255,255,255,0.03)' }}
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
              { type: 'dod', label: 'Don on Duty 🔒' },
              { type: 'hangout', label: 'Friday Hangout 🔒' },
              { type: 'meal', label: 'Meals' },
              { type: 'study', label: 'Study' },
              { type: 'personal', label: 'Personal' },
              { type: 'social', label: 'Free Time' }
            ].map(item => (
              <div key={item.type} className="legend-item">
                <div className="legend-color" style={getBlockStyle(item.type, false)}></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {rlmImage && (
            <div style={{ marginTop: 25 }}>
              <h3 style={{ marginBottom: 10, fontSize: 16 }}>📅 RLM Calendar</h3>
              <img
                src={rlmImage}
                alt="RLM Calendar"
                style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, cursor: 'pointer' }}
                onClick={() => setShowImageModal(rlmImage)}
              />
            </div>
          )}

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
