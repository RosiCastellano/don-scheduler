import React, { useState, useRef } from 'react';
import { Upload, Plus, X, Calendar, Clock, Users, BookOpen, Image, ChevronRight, ChevronLeft, GripVertical, Lock, PartyPopper, UserCheck, Loader, Sparkles, AlertCircle, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

const BLOCK_TYPES = [
  { type: 'meal', name: 'Meal', locked: false },
  { type: 'study', name: 'Study', locked: false },
  { type: 'personal', name: 'Personal', locked: false },
  { type: 'social', name: 'Social', locked: false },
];

export default function DonScheduler() {
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classImages, setClassImages] = useState([]);
  const [parsingClasses, setParsingClasses] = useState(false);
  const [classParseError, setClassParseError] = useState(null);
  const [rlmImage, setRlmImage] = useState(null);
  const [rlmTasks, setRlmTasks] = useState([]);
  const [parsingRLM, setParsingRLM] = useState(false);
  const [rlmParseError, setRlmParseError] = useState(null);
  const [dodShifts, setDodShifts] = useState([]);
  const [newDodDay, setNewDodDay] = useState('Monday');
  const [fridayHangouts, setFridayHangouts] = useState([]);
  const [newFNH, setNewFNH] = useState({ date: '', startTime: '19:00', endTime: '21:00' });
  const [communityMeetings, setCommunityMeetings] = useState([]);
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [communitySize, setCommunitySize] = useState('');
  const [connectionDeadline, setConnectionDeadline] = useState('');
  const [completedConnections, setCompletedConnections] = useState('');
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [editMode, setEditMode] = useState('drag');
  const [showAddModal, setShowAddModal] = useState(null);
  const [isDraggingClass, setIsDraggingClass] = useState(false);
  const [isDraggingRLM, setIsDraggingRLM] = useState(false);

  const classInputRef = useRef(null);
  const rlmInputRef = useRef(null);

  const parseClassScheduleWithAI = async (imageData) => {
    setParsingClasses(true);
    setClassParseError(null);
    try {
      const mediaType = imageData.includes('data:image/png') ? 'image/png' : 
                        imageData.includes('data:image/jpeg') ? 'image/jpeg' : 
                        imageData.includes('data:image/jpg') ? 'image/jpeg' : 'image/png';
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageData.split(',')[1] } },
              { type: "text", text: `Analyze this class schedule image carefully. This is a university timetable grid with:
- Days of the week as columns (Monday, Tuesday, Wednesday, Thursday, Friday)
- Hours/times as rows (8:00, 9:00, 10:00, etc.)
- Class blocks containing course codes, times, and room locations

For each class block you find, extract:
1. Course name/code (e.g., "SOCI-2110H", "HIST-3320H", "CAST-3740H")
2. The day of the week it appears in (Monday, Tuesday, Wednesday, Thursday, Friday)
3. Start time in 24-hour format (e.g., "09:00", "13:00", "17:00")
4. End time in 24-hour format - round up to next hour (11:50 becomes "12:00", 15:50 becomes "16:00")

IMPORTANT RULES:
- Create a SEPARATE entry for EACH day a class appears
- Look at which COLUMN the class is in to determine the day
- Look at which ROW the class starts in to determine start time
- Course codes look like "XXXX-####H" format (4 letters, dash, 4 numbers, H)
- The colored/shaded cells indicate class times

Return ONLY a valid JSON array, nothing else:
[
  {"name": "SOCI-2110H", "day": "Tuesday", "startTime": "09:00", "endTime": "12:00"},
  {"name": "SOCI-2110H", "day": "Monday", "startTime": "09:00", "endTime": "12:00"}
]

If you cannot read clearly, return: []` }
            ]
          }]
        })
      });
      const data = await response.json();
      console.log('API Response:', data);
      const text = data.content?.map(item => item.text || "").join("") || "";
      console.log('Response text:', text);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed classes:', parsed);
        const classesWithIds = parsed.map((cls, idx) => ({
          ...cls, 
          id: Date.now() + idx,
          startTime: String(parseInt(cls.startTime?.split(':')[0]) || 9),
          endTime: String(parseInt(cls.endTime?.split(':')[0]) || 10)
        }));
        if (classesWithIds.length > 0) {
          setClasses(prev => [...prev, ...classesWithIds]);
        } else {
          setClassParseError('No classes detected. Try adding manually.');
        }
      } else {
        setClassParseError('Could not parse response. Please add classes manually.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      setClassParseError('Could not parse schedule. Please add classes manually.');
    } finally {
      setParsingClasses(false);
    }
  };

  const parseRLMWithAI = async (imageData) => {
    setParsingRLM(true);
    setRlmParseError(null);
    try {
      const mediaType = imageData.includes('data:image/png') ? 'image/png' : 'image/jpeg';
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageData.split(',')[1] } },
              { type: "text", text: `Analyze this RLM/residence life calendar and extract all tasks, events, and deadlines.

Look for:
- Tasks with due dates (e.g., "Community Connection Conversations #1 Due")
- Events spanning date ranges (shown by arrows or lines)
- Friday Night Hangouts
- Meetings
- Move-in days, orientation events

For each item found, extract:
- Task/event name
- Start date (YYYY-MM-DD format)
- End date/due date (YYYY-MM-DD format)
- Type: "deadline", "event", "meeting", or "hangout"

Return ONLY a valid JSON array ordered by date:
[
  {"name": "Move In Day", "startDate": "2025-08-31", "endDate": "2025-08-31", "type": "event"},
  {"name": "Community Connection Conversations #1 Due", "startDate": "2025-08-31", "endDate": "2025-09-08", "type": "deadline"}
]

If unclear, return: []` }
            ]
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(item => item.text || "").join("") || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setRlmTasks(parsed);
        const connectionTask = parsed.find(t => t.name.toLowerCase().includes('community connection'));
        if (connectionTask && !connectionDeadline) setConnectionDeadline(connectionTask.endDate);
      }
    } catch (error) {
      setRlmParseError('Could not parse RLM. Use as reference.');
    } finally {
      setParsingRLM(false);
    }
  };

  const processFile = async (file, type) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      if (type === 'class') {
        setClassImages(prev => [...prev, { data: imageData, name: file.name }]);
        await parseClassScheduleWithAI(imageData);
      } else if (type === 'rlm') {
        setRlmImage(imageData);
        await parseRLMWithAI(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClassFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await processFile(file, 'class');
    }
    if (classInputRef.current) classInputRef.current.value = '';
  };

  const handleRLMFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file, 'rlm');
    }
    if (rlmInputRef.current) rlmInputRef.current.value = '';
  };

  // Drag handlers for class upload
  const handleClassDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingClass(true);
  };

  const handleClassDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingClass(false);
  };

  const handleClassDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingClass(false);
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await processFile(file, 'class');
      }
    }
  };

  // Drag handlers for RLM upload
  const handleRLMDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRLM(true);
  };

  const handleRLMDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRLM(false);
  };

  const handleRLMDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingRLM(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processFile(file, 'rlm');
    }
  };

  const addClass = () => {
    if (newClass.name && parseInt(newClass.startTime) < parseInt(newClass.endTime)) {
      setClasses([...classes, { ...newClass, id: Date.now() }]);
      setNewClass({ name: '', day: 'Monday', startTime: '9', endTime: '10' });
      setIsAddingClass(false);
    }
  };

  const calculateFNHHours = (start, end) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return Math.max(0, ((endH * 60 + endM) - (startH * 60 + startM)) / 60).toFixed(1);
  };

  const addFNH = () => {
    if (newFNH.date && newFNH.startTime && newFNH.endTime) {
      setFridayHangouts([...fridayHangouts, { ...newFNH, id: Date.now(), hours: parseFloat(calculateFNHHours(newFNH.startTime, newFNH.endTime)) }]);
      setNewFNH({ date: '', startTime: '19:00', endTime: '21:00' });
    }
  };

  const calculateConnections = () => {
    const size = parseInt(communitySize) || 0;
    const completed = parseInt(completedConnections) || 0;
    const remaining = Math.max(0, size - completed);
    if (!connectionDeadline) return { remaining, weeksLeft: 0, perWeek: 0, perDay: 0 };
    const weeksLeft = Math.max(0.5, (new Date(connectionDeadline) - new Date()) / (7 * 24 * 60 * 60 * 1000));
    return { remaining, weeksLeft: weeksLeft.toFixed(1), perWeek: Math.ceil(remaining / weeksLeft), perDay: Math.ceil(remaining / (weeksLeft * 7)) };
  };

  const generateSchedule = () => {
    const schedule = {};
    DAYS.forEach(day => { schedule[day] = HOURS.map(hour => ({ hour, block: null })); });

    classes.forEach(cls => {
      const daySchedule = schedule[cls.day];
      if (daySchedule) {
        for (let h = parseInt(cls.startTime); h < parseInt(cls.endTime); h++) {
          const slot = daySchedule.find(d => d.hour === h);
          if (slot && !slot.block) slot.block = { type: 'class', name: cls.name, locked: true };
        }
      }
    });

    dodShifts.forEach(day => {
      for (let h = 20; h <= 22; h++) {
        const slot = schedule[day]?.find(d => d.hour === h);
        if (slot && !slot.block) slot.block = { type: 'dod', name: 'DOD', locked: true };
      }
    });

    fridayHangouts.forEach(fnh => {
      const startH = parseInt(fnh.startTime.split(':')[0]);
      const endH = parseInt(fnh.endTime.split(':')[0]);
      for (let h = startH; h < endH; h++) {
        const slot = schedule['Friday']?.find(d => d.hour === h);
        if (slot && !slot.block) slot.block = { type: 'hangout', name: 'FNH', locked: true };
      }
    });

    communityMeetings.forEach(() => {
      const slot = schedule['Sunday']?.find(d => d.hour === 19 && !d.block);
      if (slot) slot.block = { type: 'meeting', name: 'Meeting', locked: true };
    });

    [{ name: 'Breakfast', start: 8, end: 9 }, { name: 'Lunch', start: 12, end: 13 }, { name: 'Dinner', start: 18, end: 19 }].forEach(meal => {
      DAYS.forEach(day => {
        for (let h = meal.start; h < meal.end; h++) {
          const slot = schedule[day].find(d => d.hour === h);
          if (slot && !slot.block) slot.block = { type: 'meal', name: meal.name, locked: false };
        }
      });
    });

    DAYS.forEach(day => {
      let added = 0;
      for (let h = 14; h <= 22 && added < 3; h++) {
        const slot = schedule[day].find(d => d.hour === h);
        if (slot && !slot.block) { slot.block = { type: 'personal', name: 'Personal', locked: false }; added++; }
      }
    });

    const studyPerDay = { Monday: 2, Tuesday: 2, Wednesday: 1, Thursday: 2, Friday: 1, Saturday: 1, Sunday: 1 };
    DAYS.forEach(day => {
      let added = 0;
      for (let h = 9; h <= 21 && added < studyPerDay[day]; h++) {
        const slot = schedule[day].find(d => d.hour === h);
        if (slot && !slot.block) { slot.block = { type: 'study', name: 'Study', locked: false }; added++; }
      }
    });

    DAYS.forEach(day => {
      for (let h = 14; h <= 22; h++) {
        const slot = schedule[day].find(d => d.hour === h);
        if (slot && !slot.block) slot.block = { type: 'social', name: 'Social', locked: false };
      }
    });

    setGeneratedSchedule(schedule);
    setStep(7);
  };

  const handleBlockDrop = (targetDay, targetHour) => {
    if (!draggedBlock || !generatedSchedule) return;
    const targetSlot = generatedSchedule[targetDay].find(d => d.hour === targetHour);
    if (!targetSlot || targetSlot.block?.locked) return;
    const newSchedule = { ...generatedSchedule };
    const sourceSlot = newSchedule[draggedBlock.day].find(d => d.hour === draggedBlock.hour);
    const temp = sourceSlot.block;
    sourceSlot.block = targetSlot.block;
    targetSlot.block = temp;
    setGeneratedSchedule(newSchedule);
    setDraggedBlock(null);
  };

  const handleCellClick = (day, hour) => {
    if (!generatedSchedule) return;
    const slot = generatedSchedule[day].find(d => d.hour === hour);
    
    if (editMode === 'delete' && slot?.block && !slot.block.locked) {
      const newSchedule = { ...generatedSchedule };
      const targetSlot = newSchedule[day].find(d => d.hour === hour);
      targetSlot.block = null;
      setGeneratedSchedule(newSchedule);
    } else if (editMode === 'add' && !slot?.block) {
      setShowAddModal({ day, hour });
    }
  };

  const addBlockToSchedule = (day, hour, type) => {
    if (!generatedSchedule) return;
    const newSchedule = { ...generatedSchedule };
    const slot = newSchedule[day].find(d => d.hour === hour);
    if (slot && !slot.block) {
      const names = { meal: 'Meal', study: 'Study', personal: 'Personal', social: 'Social' };
      slot.block = { type, name: names[type], locked: false };
      setGeneratedSchedule(newSchedule);
    }
    setShowAddModal(null);
  };

  const calculateCategoryHours = () => {
    if (!generatedSchedule) return {};
    const hours = { class: 0, dod: 0, hangout: 0, meeting: 0, meal: 0, study: 0, personal: 0, social: 0 };
    DAYS.forEach(day => {
      generatedSchedule[day].forEach(slot => {
        if (slot.block) hours[slot.block.type] = (hours[slot.block.type] || 0) + 1;
      });
    });
    return hours;
  };

  const categoryHours = calculateCategoryHours();
  const connectionStats = calculateConnections();
  const totalFNHHours = fridayHangouts.reduce((sum, f) => sum + (f.hours || 0), 0);

  const getBlockStyle = (type) => ({
    class: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' },
    dod: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' },
    hangout: { background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: 'white' },
    meeting: { background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', color: 'white' },
    meal: { background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' },
    personal: { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#1a1a2e' },
    study: { background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: '#1a1a2e' },
    social: { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#1a1a2e' }
  }[type] || {});

  const formatHour = (h) => h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
  const formatDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const formatTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const getTaskColor = (type) => ({ deadline: '#ef4444', event: '#22c55e', meeting: '#14b8a6', hangout: '#ec4899' }[type] || '#667eea');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: "'Nunito', sans-serif", color: '#e8e8e8', padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap');
        * { box-sizing: border-box; }
        .glass-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 30px; margin-bottom: 20px; }
        .step-indicator { display: flex; gap: 8px; margin-bottom: 30px; justify-content: center; flex-wrap: wrap; }
        .step-dot { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; }
        .step-dot.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 8px 32px rgba(102,126,234,0.4); transform: scale(1.1); }
        .step-dot.completed { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #1a1a2e; }
        .step-dot.inactive { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 14px 28px; border-radius: 12px; color: white; font-weight: 700; font-size: 16px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .btn-secondary { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .btn-add { background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; padding: 10px 18px; border-radius: 10px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
        .input-field { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 14px 18px; color: white; font-size: 16px; width: 100%; font-family: inherit; }
        .input-field:focus { outline: none; border-color: #667eea; }
        select.input-field option { background: #302b63; color: white; }
        .tag { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 30px; margin: 5px; font-size: 14px; font-weight: 600; }
        .tag button { background: rgba(255,255,255,0.2); border: none; width: 22px; height: 22px; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .tag.class { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .tag.dod { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .tag.meeting { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); }
        .tag.fnh { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); }
        .upload-zone { border: 2px dashed rgba(255,255,255,0.3); border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .upload-zone:hover, .upload-zone.dragging { border-color: #667eea; background: rgba(102,126,234,0.15); }
        .stat-card { background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2)); border-radius: 16px; padding: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .stat-number { font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #667eea, #f093fb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-label { font-size: 12px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        .schedule-grid { display: grid; grid-template-columns: 55px repeat(7, 1fr); gap: 3px; font-size: 10px; }
        .schedule-header { background: rgba(102,126,234,0.3); padding: 10px 4px; text-align: center; font-weight: 700; border-radius: 8px; font-size: 11px; }
        .schedule-time { background: rgba(255,255,255,0.05); padding: 6px 2px; text-align: center; font-size: 9px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
        .schedule-cell { min-height: 38px; border-radius: 6px; padding: 3px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 600; font-size: 8px; position: relative; cursor: pointer; transition: all 0.2s; }
        .schedule-cell.draggable { cursor: grab; }
        .schedule-cell.draggable:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .schedule-cell.drag-over { outline: 2px dashed #667eea; }
        .schedule-cell.delete-mode:hover { outline: 2px solid #ef4444; }
        .schedule-cell.add-mode:hover { outline: 2px solid #22c55e; }
        .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; justify-content: center; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 8px; }
        .legend-color { width: 14px; height: 14px; border-radius: 4px; }
        .legend-hours { opacity: 0.7; font-size: 10px; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { background: rgba(48,43,99,0.95); border-radius: 20px; padding: 30px; max-width: 400px; width: 100%; }
        .parsing-indicator { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: rgba(102,126,234,0.2); border: 1px solid rgba(102,126,234,0.4); border-radius: 12px; margin-bottom: 20px; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .error-box { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; color: #ef4444; margin-bottom: 20px; }
        .success-box { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); border-radius: 12px; color: #22c55e; margin-bottom: 20px; }
        .task-item { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: rgba(255,255,255,0.05); border-radius: 12px; border-left: 4px solid; margin-bottom: 10px; }
        h1 { font-family: 'Playfair Display', serif; font-size: 42px; text-align: center; margin-bottom: 10px; background: linear-gradient(135deg, #fff, #a8edea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
        .subtitle { text-align: center; opacity: 0.7; margin-bottom: 30px; font-size: 16px; }
        .section-desc { opacity: 0.7; margin-bottom: 20px; font-size: 14px; }
        .nav-buttons { display: flex; justify-content: space-between; margin-top: 25px; }
        .form-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 15px; }
        .edit-toolbar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .edit-btn { padding: 10px 16px; border-radius: 10px; border: 2px solid transparent; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .edit-btn.active { transform: scale(1.05); }
        .edit-btn.drag { background: rgba(102,126,234,0.2); color: #667eea; border-color: rgba(102,126,234,0.4); }
        .edit-btn.drag.active { background: rgba(102,126,234,0.4); border-color: #667eea; }
        .edit-btn.delete { background: rgba(239,68,68,0.2); color: #ef4444; border-color: rgba(239,68,68,0.4); }
        .edit-btn.delete.active { background: rgba(239,68,68,0.4); border-color: #ef4444; }
        .edit-btn.add { background: rgba(34,197,94,0.2); color: #22c55e; border-color: rgba(34,197,94,0.4); }
        .edit-btn.add.active { background: rgba(34,197,94,0.4); border-color: #22c55e; }
        .add-block-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; }
        .add-block-btn { padding: 15px; border-radius: 12px; border: none; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .add-block-btn:hover { transform: scale(1.03); }
        .image-preview { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .image-preview img { width: 80px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); }
        .hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
      `}</style>

      {/* Hidden file inputs */}
      <input 
        type="file" 
        ref={classInputRef} 
        className="hidden-input" 
        accept="image/*" 
        onChange={handleClassFileSelect} 
      />
      <input 
        type="file" 
        ref={rlmInputRef} 
        className="hidden-input" 
        accept="image/*" 
        onChange={handleRLMFileSelect} 
      />

      <h1>Don Schedule Manager</h1>
      <p className="subtitle">Balance classes, don duties & personal time</p>

      <div className="step-indicator">
        {[1,2,3,4,5,6,7].map(s => (
          <div key={s} className={`step-dot ${step === s ? 'active' : step > s ? 'completed' : 'inactive'}`} onClick={() => s <= step && setStep(s)}>
            {step > s ? '✓' : s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><BookOpen size={24} /> Class Schedule</h2>
          <p className="section-desc">Upload a screenshot of your timetable - AI will extract your classes</p>
          {parsingClasses && <div className="parsing-indicator"><Loader size={20} className="spinner" /><span><strong>Analyzing schedule...</strong> This may take a few seconds</span></div>}
          {classParseError && <div className="error-box"><AlertCircle size={18} />{classParseError}</div>}
          {classes.length > 0 && !parsingClasses && <div className="success-box"><Sparkles size={18} /><strong>{classes.length} class blocks detected!</strong> Review below and edit if needed.</div>}
          
          <div 
            className={`upload-zone ${isDraggingClass ? 'dragging' : ''}`}
            onClick={() => classInputRef.current?.click()}
            onDragOver={handleClassDragOver}
            onDragEnter={handleClassDragOver}
            onDragLeave={handleClassDragLeave}
            onDrop={handleClassDrop}
            style={{ marginBottom: 20 }}
          >
            <Image size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 5 }}>Supports timetable grids, screenshots, etc.</div>
          </div>
          
          {classImages.length > 0 && (
            <div className="image-preview">
              {classImages.map((img, idx) => (
                <img key={idx} src={img.data} alt="Schedule" onClick={() => setShowImageModal(img.data)} />
              ))}
            </div>
          )}
          
          <div className="form-row" style={{ marginTop: 15 }}>
            {!isAddingClass && <button className="btn-secondary" onClick={() => setIsAddingClass(true)}><Plus size={18} /> Add Manually</button>}
            {classes.length > 0 && <button className="btn-secondary" onClick={() => setClasses([])}><Trash2 size={18} /> Clear All</button>}
          </div>
          
          {isAddingClass && (
            <div style={{ padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 20 }}>
              <div className="form-row">
                <input className="input-field" placeholder="Class name (e.g., SOCI-2110H)" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} style={{ flex: 1 }} />
                <select className="input-field" value={newClass.day} onChange={e => setNewClass({ ...newClass, day: e.target.value })} style={{ width: 'auto' }}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <select className="input-field" value={newClass.startTime} onChange={e => setNewClass({ ...newClass, startTime: e.target.value })} style={{ width: 'auto' }}>
                  {HOURS.slice(0,-1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
                <span>to</span>
                <select className="input-field" value={newClass.endTime} onChange={e => setNewClass({ ...newClass, endTime: e.target.value })} style={{ width: 'auto' }}>
                  {HOURS.slice(1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
                <button className="btn-add" onClick={addClass}>Save</button>
                <button className="btn-secondary" onClick={() => setIsAddingClass(false)}>Cancel</button>
              </div>
            </div>
          )}
          
          {classes.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Detected Classes:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {classes.map(cls => (
                  <span key={cls.id} className="tag class">
                    {cls.name} • {cls.day?.slice(0,3)} {formatHour(parseInt(cls.startTime))}-{formatHour(parseInt(cls.endTime))}
                    <button onClick={() => setClasses(classes.filter(c => c.id !== cls.id))}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="nav-buttons"><div></div><button className="btn-primary" onClick={() => setStep(2)}>Continue <ChevronRight size={20} /></button></div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2><Calendar size={24} /> RLM Calendar</h2>
          <p className="section-desc">Upload RLM - AI extracts deadlines & date ranges</p>
          {parsingRLM && <div className="parsing-indicator"><Loader size={20} className="spinner" /><span><strong>Analyzing RLM...</strong></span></div>}
          {rlmParseError && <div className="error-box"><AlertCircle size={18} />{rlmParseError}</div>}
          {rlmTasks.length > 0 && !parsingRLM && <div className="success-box"><Sparkles size={18} /><strong>{rlmTasks.length} tasks detected!</strong></div>}
          {!rlmImage ? (
            <div 
              className={`upload-zone ${isDraggingRLM ? 'dragging' : ''}`}
              onClick={() => rlmInputRef.current?.click()}
              onDragOver={handleRLMDragOver}
              onDragEnter={handleRLMDragOver}
              onDragLeave={handleRLMDragLeave}
              onDrop={handleRLMDrop}
              style={{ marginBottom: 20 }}
            >
              <Calendar size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Drag & drop or click to upload</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 5 }}>Your Term at a Glance calendar</div>
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <img src={rlmImage} alt="RLM" style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 12, cursor: 'pointer', display: 'block', margin: '0 auto 15px' }} onClick={() => setShowImageModal(rlmImage)} />
              <div style={{ textAlign: 'center', marginBottom: 15 }}>
                <button className="btn-secondary" onClick={() => { setRlmImage(null); setRlmTasks([]); }}>
                  <Trash2 size={16} /> Remove & Upload New
                </button>
              </div>
              {rlmTasks.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}><Sparkles size={18} /> Extracted Deadlines</h3>
                  {rlmTasks.map((task, idx) => (
                    <div key={idx} className="task-item" style={{ borderLeftColor: getTaskColor(task.type) }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{task.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDate(task.startDate)}{task.endDate !== task.startDate && ` → ${formatDate(task.endDate)}`}</div>
                      </div>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>{task.type}</span>
                      <button onClick={() => setRlmTasks(rlmTasks.filter((_,i) => i !== idx))} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', padding: 6, borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(3)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Clock size={24} /> Don on Duty</h2>
          <p className="section-desc">Select DOD days (8-10 PM)</p>
          <div className="form-row">
            <select className="input-field" value={newDodDay} onChange={e => setNewDodDay(e.target.value)} style={{ width: 'auto' }}>
              {DAYS.filter(d => !dodShifts.includes(d)).map(d => <option key={d}>{d}</option>)}
            </select>
            <button className="btn-add" onClick={() => { if (!dodShifts.includes(newDodDay)) setDodShifts([...dodShifts, newDodDay]); }}><Plus size={18} /> Add</button>
          </div>
          {dodShifts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {dodShifts.map(day => <span key={day} className="tag dod">{day}<button onClick={() => setDodShifts(dodShifts.filter(d => d !== day))}>×</button></span>)}
            </div>
          )}
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(4)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><PartyPopper size={24} /> Friday Night Hangouts</h2>
          <p className="section-desc">Add shifts with start/end times</p>
          <div style={{ padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 20 }}>
            <div className="form-row">
              <div style={{ flex: 1 }}><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Date</label><input type="date" className="input-field" value={newFNH.date} onChange={e => setNewFNH({ ...newFNH, date: e.target.value })} /></div>
              <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Start</label><input type="time" className="input-field" value={newFNH.startTime} onChange={e => setNewFNH({ ...newFNH, startTime: e.target.value })} style={{ width: 130 }} /></div>
              <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>End</label><input type="time" className="input-field" value={newFNH.endTime} onChange={e => setNewFNH({ ...newFNH, endTime: e.target.value })} style={{ width: 130 }} /></div>
            </div>
            <div className="form-row" style={{ marginTop: 15, marginBottom: 0 }}>
              <div style={{ flex: 1, opacity: 0.7 }}>Duration: <strong>{calculateFNHHours(newFNH.startTime, newFNH.endTime)}h</strong></div>
              <button className="btn-add" onClick={addFNH} disabled={!newFNH.date}><Plus size={18} /> Add</button>
            </div>
          </div>
          {fridayHangouts.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}><span>Hangouts:</span><span style={{ opacity: 0.7 }}>Total: {totalFNHHours}h</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {fridayHangouts.map(fnh => <span key={fnh.id} className="tag fnh">{formatDate(fnh.date)} • {formatTime(fnh.startTime)}-{formatTime(fnh.endTime)} ({fnh.hours}h)<button onClick={() => setFridayHangouts(fridayHangouts.filter(f => f.id !== fnh.id))}>×</button></span>)}
              </div>
            </div>
          )}
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(5)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><UserCheck size={24} /> Community Meetings</h2>
          <div className="form-row">
            <input type="date" className="input-field" value={newMeetingDate} onChange={e => setNewMeetingDate(e.target.value)} style={{ width: 'auto' }} />
            <button className="btn-add" onClick={() => { if (newMeetingDate) { setCommunityMeetings([...communityMeetings, newMeetingDate]); setNewMeetingDate(''); } }} disabled={!newMeetingDate}><Plus size={18} /> Add</button>
          </div>
          {communityMeetings.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap' }}>{communityMeetings.sort().map(d => <span key={d} className="tag meeting">{formatDate(d)}<button onClick={() => setCommunityMeetings(communityMeetings.filter(m => m !== d))}>×</button></span>)}</div>}
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(4)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={() => setStep(6)}>Continue <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2><Users size={24} /> Community Connections</h2>
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 25 }}>
            <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Community Size</label><input className="input-field" type="number" placeholder="# residents" value={communitySize} onChange={e => setCommunitySize(e.target.value)} /></div>
            <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Completed</label><input className="input-field" type="number" placeholder="Done" value={completedConnections} onChange={e => setCompletedConnections(e.target.value)} /></div>
            <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Deadline {connectionDeadline && <span style={{ opacity: 0.6 }}>(from RLM)</span>}</label><input className="input-field" type="date" value={connectionDeadline} onChange={e => setConnectionDeadline(e.target.value)} /></div>
          </div>
          {communitySize && connectionDeadline && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div className="stat-card"><div className="stat-number">{connectionStats.remaining}</div><div className="stat-label">Remaining</div></div>
              <div className="stat-card"><div className="stat-number">{connectionStats.weeksLeft}</div><div className="stat-label">Weeks Left</div></div>
              <div className="stat-card"><div className="stat-number">{connectionStats.perWeek}</div><div className="stat-label">Per Week</div></div>
              <div className="stat-card"><div className="stat-number">{connectionStats.perDay}</div><div className="stat-label">Per Day</div></div>
            </div>
          )}
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(5)}><ChevronLeft size={20} /> Back</button>
            <button className="btn-primary" onClick={generateSchedule}>Generate <ChevronRight size={20} /></button>
          </div>
        </div>
      )}

      {step === 7 && generatedSchedule && (
        <div className="glass-card">
          <h2><Calendar size={24} /> Your Schedule</h2>
          
          <div className="edit-toolbar">
            <button className={`edit-btn drag ${editMode === 'drag' ? 'active' : ''}`} onClick={() => setEditMode('drag')}>
              <GripVertical size={16} /> Move
            </button>
            <button className={`edit-btn delete ${editMode === 'delete' ? 'active' : ''}`} onClick={() => setEditMode('delete')}>
              <Trash2 size={16} /> Delete
            </button>
            <button className={`edit-btn add ${editMode === 'add' ? 'active' : ''}`} onClick={() => setEditMode('add')}>
              <Plus size={16} /> Add
            </button>
            <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 13 }}>
              {editMode === 'drag' && '🔒 = locked • Drag unlocked blocks'}
              {editMode === 'delete' && 'Click unlocked blocks to remove'}
              {editMode === 'add' && 'Click empty slots to add blocks'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div className="schedule-grid" style={{ minWidth: 650 }}>
              <div className="schedule-header"></div>
              {DAYS.map(d => <div key={d} className="schedule-header">{d.slice(0,3)}</div>)}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="schedule-time">{formatHour(hour)}</div>
                  {DAYS.map(day => {
                    const slot = generatedSchedule[day].find(h => h.hour === hour);
                    const block = slot?.block;
                    const draggable = editMode === 'drag' && block && !block.locked;
                    const cellClass = `schedule-cell ${draggable ? 'draggable' : ''} ${editMode === 'delete' && block && !block.locked ? 'delete-mode' : ''} ${editMode === 'add' && !block ? 'add-mode' : ''}`;
                    return (
                      <div 
                        key={`${day}-${hour}`} 
                        className={cellClass} 
                        style={block ? getBlockStyle(block.type) : { background: 'rgba(255,255,255,0.03)' }} 
                        draggable={draggable} 
                        onDragStart={() => draggable && setDraggedBlock({ day, hour, block })} 
                        onDragEnd={() => setDraggedBlock(null)} 
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }} 
                        onDragLeave={e => e.currentTarget.classList.remove('drag-over')} 
                        onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleBlockDrop(day, hour); }}
                        onClick={() => handleCellClick(day, hour)}
                      >
                        {block?.name || ''}{block?.locked && <Lock size={8} style={{ position: 'absolute', top: 2, right: 2, opacity: 0.6 }} />}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="legend">
            {[
              { type: 'class', label: 'Classes', locked: true },
              { type: 'dod', label: 'DOD', locked: true },
              { type: 'hangout', label: 'FNH', locked: true },
              { type: 'meeting', label: 'Meeting', locked: true },
              { type: 'meal', label: 'Meals', locked: false },
              { type: 'study', label: 'Study', locked: false },
              { type: 'personal', label: 'Personal', locked: false },
              { type: 'social', label: 'Social', locked: false }
            ].map(item => (
              <div key={item.type} className="legend-item">
                <div className="legend-color" style={getBlockStyle(item.type)}></div>
                <span>{item.label} {item.locked && '🔒'}</span>
                <span className="legend-hours">{categoryHours[item.type] || 0}h</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#667eea' }}>{categoryHours.class || 0}h</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Classes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{(categoryHours.dod || 0) + (categoryHours.hangout || 0) + (categoryHours.meeting || 0)}h</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Don Duties</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fa709a' }}>{categoryHours.study || 0}h</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Study</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#4facfe' }}>{categoryHours.personal || 0}h</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Personal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#a8edea' }}>{categoryHours.social || 0}h</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Social</div>
            </div>
          </div>

          {rlmTasks.length > 0 && (
            <div style={{ marginTop: 25, padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
              <h3 style={{ marginBottom: 12, fontSize: 16 }}>📋 Deadlines (from RLM)</h3>
              {rlmTasks.slice(0,5).map((task, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getTaskColor(task.type) }}></span>
                  <span style={{ flex: 1 }}>{task.name}</span>
                  <span style={{ opacity: 0.7 }}>{formatDate(task.endDate)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => setStep(6)}><ChevronLeft size={20} /> Edit</button>
            <button className="btn-secondary" onClick={() => { setStep(1); setGeneratedSchedule(null); }}>Start Over</button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 5 }}>Add Block</h3>
            <p style={{ opacity: 0.7, marginBottom: 15, fontSize: 14 }}>{showAddModal.day} at {formatHour(showAddModal.hour)}</p>
            <div className="add-block-grid">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} className="add-block-btn" style={getBlockStyle(bt.type)} onClick={() => addBlockToSchedule(showAddModal.day, showAddModal.hour, bt.type)}>
                  {bt.name}
                </button>
              ))}
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: 15, justifyContent: 'center' }} onClick={() => setShowAddModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {showImageModal && typeof showImageModal === 'string' && (
        <div className="modal-overlay" onClick={() => setShowImageModal(null)}>
          <img src={showImageModal} alt="Full" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
